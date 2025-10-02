module rent_escrow_addr::rent_escrow_v3 {
    use std::string::String;
    use std::vector;
    use std::signer;
    
    use aptos_framework::primary_fungible_store;
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::object::Object;
    use aptos_framework::account::{Self, SignerCapability};
    use aptos_framework::timestamp;

    // Constants
    const RESOURCE_ACCOUNT_SEED: vector<u8> = b"RENT_ESCROW_V3_RESOURCE_ACCOUNT";

    // Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_ESCROW_NOT_FOUND: u64 = 3;
    const E_ALREADY_SIGNED: u64 = 4;
    const E_NOT_BOTH_SIGNED: u64 = 5;
    const E_ALREADY_DEPOSITED: u64 = 6;
    const E_NOT_DEPOSITED: u64 = 7;
    const E_ALREADY_SETTLED: u64 = 8;
    const E_TERM_NOT_ENDED: u64 = 9;

    // Structs
    struct EscrowAgreement has key, store {
        id: u64,
        landlord: address,
        tenant: address,
        property_name: String,
        property_address: String,
        security_deposit: u64, // in USDC (6 decimals)
        monthly_rent: u64, // in USDC (6 decimals)
        start_date: u64, // timestamp
        end_date: u64, // timestamp
        landlord_signed: bool,
        tenant_signed: bool,
        deposited_amount: u64,
        settled: bool,
        created_at: u64,
    }

    struct EscrowRegistry has key {
        escrows: vector<EscrowAgreement>,
        next_id: u64,
        platform_treasury: address,
        resource_account_address: address,
    }

    // Resource account management structure
    struct ResourceAccountCap has key {
        signer_cap: SignerCapability,
    }

    /// Initialize the escrow registry (called once during deployment)
    public entry fun initialize(deployer: &signer) {
        let deployer_addr = signer::address_of(deployer);
        
        // Create resource account for secure fund management
        let (resource_signer, signer_cap) = account::create_resource_account(deployer, RESOURCE_ACCOUNT_SEED);
        let resource_account_address = signer::address_of(&resource_signer);
        
        // Store the signer capability under the deployer's account
        move_to(deployer, ResourceAccountCap {
            signer_cap,
        });

        // Initialize the registry
        move_to(deployer, EscrowRegistry {
            escrows: vector::empty<EscrowAgreement>(),
            next_id: 1,
            platform_treasury: deployer_addr,
            resource_account_address,
        });
    }

    /// Create a new escrow agreement (called by landlord)
    public entry fun create_escrow(
        landlord: &signer,
        tenant: address,
        property_name: String,
        property_address: String,
        security_deposit: u64,
        monthly_rent: u64,
        start_date: u64,
        end_date: u64,
    ) acquires EscrowRegistry {
        let landlord_addr = signer::address_of(landlord);
        let registry = borrow_global_mut<EscrowRegistry>(@rent_escrow_addr);
        
        let escrow = EscrowAgreement {
            id: registry.next_id,
            landlord: landlord_addr,
            tenant,
            property_name,
            property_address,
            security_deposit,
            monthly_rent,
            start_date,
            end_date,
            landlord_signed: true,
            tenant_signed: false,
            deposited_amount: 0,
            settled: false,
            created_at: timestamp::now_seconds(),
        };
        
        vector::push_back(&mut registry.escrows, escrow);
        registry.next_id = registry.next_id + 1;
    }

    /// Sign the escrow agreement (called by tenant)
    public entry fun sign_escrow(
        tenant: &signer,
        escrow_id: u64,
    ) acquires EscrowRegistry {
        let tenant_addr = signer::address_of(tenant);
        let registry = borrow_global_mut<EscrowRegistry>(@rent_escrow_addr);
        let escrow = get_escrow_mut(registry, escrow_id);
        
        assert!(escrow.tenant == tenant_addr, E_NOT_AUTHORIZED);
        assert!(!escrow.tenant_signed, E_ALREADY_SIGNED);

        escrow.tenant_signed = true;
    }

    /// Deposit USDC (called by tenant after signing)
    public entry fun deposit_funds(
        tenant: &signer,
        escrow_id: u64,
        usdc_metadata: Object<Metadata>,
    ) acquires EscrowRegistry {
        let tenant_addr = signer::address_of(tenant);
        let registry = borrow_global_mut<EscrowRegistry>(@rent_escrow_addr);
        
        let resource_account_address = registry.resource_account_address;
        let escrow = get_escrow_mut(registry, escrow_id);
        
        assert!(escrow.tenant == tenant_addr, E_NOT_AUTHORIZED);
        assert!(escrow.landlord_signed && escrow.tenant_signed, E_NOT_BOTH_SIGNED);
        assert!(escrow.deposited_amount == 0, E_ALREADY_DEPOSITED);

        let deposit_amount = escrow.security_deposit;

        // Transfer USDC from tenant to resource account
        let usdc_to_deposit = primary_fungible_store::withdraw(
            tenant,
            usdc_metadata,
            deposit_amount
        );

        // Deposit to resource account for secure storage
        primary_fungible_store::deposit(resource_account_address, usdc_to_deposit);

        // Update escrow
        escrow.deposited_amount = deposit_amount;
    }

    /// Settle the escrow after term ends
    public entry fun settle_escrow(
        _caller: &signer,
        escrow_id: u64,
        usdc_metadata: Object<Metadata>,
    ) acquires EscrowRegistry, ResourceAccountCap {
        let registry = borrow_global_mut<EscrowRegistry>(@rent_escrow_addr);
        
        let escrow = get_escrow_mut(registry, escrow_id);
        
        assert!(timestamp::now_seconds() >= escrow.end_date, E_TERM_NOT_ENDED);
        assert!(!escrow.settled, E_ALREADY_SETTLED);
        assert!(escrow.deposited_amount > 0, E_NOT_DEPOSITED);

        let tenant_addr = escrow.tenant;
        let deposit_amount = escrow.deposited_amount;

        // Mark as settled first
        escrow.settled = true;

        // Get resource account signer
        let resource_signer = get_resource_account_signer();

        // Return deposit to tenant
        let principal_fa = primary_fungible_store::withdraw(
            &resource_signer,
            usdc_metadata,
            deposit_amount
        );
        primary_fungible_store::deposit(tenant_addr, principal_fa);
    }

    // ======================== Helper Functions ========================

    /// Get mutable reference to escrow by ID
    fun get_escrow_mut(registry: &mut EscrowRegistry, escrow_id: u64): &mut EscrowAgreement {
        let len = vector::length(&registry.escrows);
        let i = 0;
        while (i < len) {
            let escrow = vector::borrow_mut(&mut registry.escrows, i);
            if (escrow.id == escrow_id) {
                return escrow
            };
            i = i + 1;
        };
        abort E_ESCROW_NOT_FOUND
    }

    /// Get immutable reference to escrow by ID
    fun get_escrow_ref(registry: &EscrowRegistry, escrow_id: u64): &EscrowAgreement {
        let len = vector::length(&registry.escrows);
        let i = 0;
        while (i < len) {
            let escrow = vector::borrow(&registry.escrows, i);
            if (escrow.id == escrow_id) {
                return escrow
            };
            i = i + 1;
        };
        abort E_ESCROW_NOT_FOUND
    }

    /// Get the resource account signer using the stored capability
    fun get_resource_account_signer(): signer acquires ResourceAccountCap {
        let resource_cap = borrow_global<ResourceAccountCap>(@rent_escrow_addr);
        account::create_signer_with_capability(&resource_cap.signer_cap)
    }

    // ======================== View Functions ========================

    #[view]
    public fun get_escrow(escrow_id: u64): (
        u64, // id
        address, // landlord
        address, // tenant
        String, // property_name
        String, // property_address
        u64, // security_deposit
        u64, // monthly_rent
        u64, // start_date
        u64, // end_date
        bool, // landlord_signed
        bool, // tenant_signed
        u64, // deposited_amount
        bool, // settled
        u64, // created_at
    ) acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@rent_escrow_addr);
        let escrow = get_escrow_ref(registry, escrow_id);
        
        (
            escrow.id,
            escrow.landlord,
            escrow.tenant,
            escrow.property_name,
            escrow.property_address,
            escrow.security_deposit,
            escrow.monthly_rent,
            escrow.start_date,
            escrow.end_date,
            escrow.landlord_signed,
            escrow.tenant_signed,
            escrow.deposited_amount,
            escrow.settled,
            escrow.created_at,
        )
    }

    #[view]
    public fun get_resource_account_address(): address acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@rent_escrow_addr);
        registry.resource_account_address
    }

    #[view]
    public fun get_all_escrows(): vector<u64> acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@rent_escrow_addr);
        let escrow_ids = vector::empty<u64>();
        
        let len = vector::length(&registry.escrows);
        let i = 0;
        while (i < len) {
            let escrow = vector::borrow(&registry.escrows, i);
            vector::push_back(&mut escrow_ids, escrow.id);
            i = i + 1;
        };
        
        escrow_ids
    }

    #[view]
    public fun get_landlord_escrows(landlord: address): vector<u64> acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@rent_escrow_addr);
        let escrow_ids = vector::empty<u64>();
        
        let len = vector::length(&registry.escrows);
        let i = 0;
        while (i < len) {
            let escrow = vector::borrow(&registry.escrows, i);
            if (escrow.landlord == landlord) {
                vector::push_back(&mut escrow_ids, escrow.id);
            };
            i = i + 1;
        };
        
        escrow_ids
    }

    #[view]
    public fun get_tenant_escrows(tenant: address): vector<u64> acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@rent_escrow_addr);
        let escrow_ids = vector::empty<u64>();
        
        let len = vector::length(&registry.escrows);
        let i = 0;
        while (i < len) {
            let escrow = vector::borrow(&registry.escrows, i);
            if (escrow.tenant == tenant) {
                vector::push_back(&mut escrow_ids, escrow.id);
            };
            i = i + 1;
        };
        
        escrow_ids
    }

    #[view]
    public fun debug_settlement_check(escrow_id: u64): (bool, bool, bool, u64, u64) acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@rent_escrow_addr);
        let escrow = get_escrow_ref(registry, escrow_id);
        let current_time = timestamp::now_seconds();
        
        (
            current_time >= escrow.end_date, // time_ended
            !escrow.settled, // not_settled
            escrow.deposited_amount > 0, // has_deposit
            current_time, // current_timestamp
            escrow.end_date // end_timestamp
        )
    }
}