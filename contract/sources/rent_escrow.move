module rent_escrow_addr::rent_escrow {
    use std::string::String;
    use std::vector;
    use std::signer;
    
    use aptos_framework::primary_fungible_store;
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::object::Object;
    use aptos_framework::account::{Self, SignerCapability};
    use aptos_framework::timestamp;

    // Constants
    const PLATFORM_FEE_BASIS_POINTS: u64 = 500; // 5% platform fee
    const RESOURCE_ACCOUNT_SEED: vector<u8> = b"RENT_ESCROW_RESOURCE_ACCOUNT";

    // Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INVALID_AMOUNT: u64 = 2;
    const E_ESCROW_NOT_FOUND: u64 = 3;
    const E_ALREADY_SIGNED: u64 = 4;
    const E_NOT_BOTH_SIGNED: u64 = 5;
    const E_ALREADY_DEPOSITED: u64 = 6;
    const E_NOT_DEPOSITED: u64 = 7;
    const E_ALREADY_SETTLED: u64 = 8;
    const E_TERM_NOT_ENDED: u64 = 9;
    const E_INVALID_DATES: u64 = 10;

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
        
        // Store the signer capability in the resource account
        move_to(&resource_signer, ResourceAccountCap {
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
        
        // Validate inputs
        assert!(security_deposit > 0, E_INVALID_AMOUNT);
        assert!(monthly_rent > 0, E_INVALID_AMOUNT);
        assert!(end_date > start_date, E_INVALID_DATES);
        assert!(start_date >= timestamp::now_seconds(), E_INVALID_DATES);

        let registry = borrow_global_mut<EscrowRegistry>(@rent_escrow_addr);
        let escrow_id = registry.next_id;
        
        let escrow = EscrowAgreement {
            id: escrow_id,
            landlord: landlord_addr,
            tenant,
            property_name,
            property_address,
            security_deposit,
            monthly_rent,
            start_date,
            end_date,
            landlord_signed: true, // Auto-sign when creating
            tenant_signed: false,
            deposited_amount: 0,
            settled: false,
            created_at: timestamp::now_seconds(),
        };

        vector::push_back(&mut registry.escrows, escrow);
        registry.next_id = registry.next_id + 1;
    }

    /// Sign escrow agreement (called by tenant)
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
        
        // Store resource account address first
        let resource_account_address = registry.resource_account_address;
        
        let escrow = get_escrow_mut(registry, escrow_id);
        assert!(escrow.tenant == tenant_addr, E_NOT_AUTHORIZED);
        assert!(escrow.landlord_signed && escrow.tenant_signed, E_NOT_BOTH_SIGNED);
        assert!(escrow.deposited_amount == 0, E_ALREADY_DEPOSITED);

        // Store deposit amount before borrowing
        let deposit_amount = escrow.security_deposit;

        // Transfer USDC from tenant to resource account
        let usdc_to_deposit = primary_fungible_store::withdraw(
            tenant,
            usdc_metadata,
            deposit_amount
        );

        // Deposit to resource account for secure storage
        primary_fungible_store::deposit(resource_account_address, usdc_to_deposit);

        escrow.deposited_amount = deposit_amount;
    }

    /// Settle the escrow after term ends (callable by anyone)
    public entry fun settle_escrow(
        _caller: &signer,
        escrow_id: u64,
        usdc_metadata: Object<Metadata>,
    ) acquires EscrowRegistry, ResourceAccountCap {
        let registry = borrow_global_mut<EscrowRegistry>(@rent_escrow_addr);
        
        // Store resource account address first
        let resource_account_address = registry.resource_account_address;
        
        let escrow = get_escrow_mut(registry, escrow_id);
        
        assert!(timestamp::now_seconds() >= escrow.end_date, E_TERM_NOT_ENDED);
        assert!(!escrow.settled, E_ALREADY_SETTLED);
        assert!(escrow.deposited_amount > 0, E_NOT_DEPOSITED);

        // Store values before borrowing
        let tenant_addr = escrow.tenant;
        let deposit_amount = escrow.deposited_amount;

        // Mark as settled first
        escrow.settled = true;

        // Get resource account signer for fund transfers
        let resource_signer = get_resource_account_signer(resource_account_address);

        // Return full deposit to tenant (no yield for now)
        if (deposit_amount > 0) {
            let principal_fa = primary_fungible_store::withdraw(
                &resource_signer,
                usdc_metadata,
                deposit_amount
            );
            primary_fungible_store::deposit(tenant_addr, principal_fa);
        };
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
        u64  // created_at
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
            escrow.created_at
        )
    }

    #[view]
    public fun get_escrows_by_landlord(landlord: address): vector<u64> acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@rent_escrow_addr);
        let escrow_ids = vector::empty<u64>();
        let i = 0;
        let len = vector::length(&registry.escrows);
        
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
    public fun get_escrows_by_tenant(tenant: address): vector<u64> acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@rent_escrow_addr);
        let escrow_ids = vector::empty<u64>();
        let i = 0;
        let len = vector::length(&registry.escrows);
        
        while (i < len) {
            let escrow = vector::borrow(&registry.escrows, i);
            if (escrow.tenant == tenant) {
                vector::push_back(&mut escrow_ids, escrow.id);
            };
            i = i + 1;
        };
        
        escrow_ids
    }

    // ======================== Helper Functions ========================

    fun get_escrow_ref(registry: &EscrowRegistry, escrow_id: u64): &EscrowAgreement {
        let i = 0;
        let len = vector::length(&registry.escrows);
        
        while (i < len) {
            let escrow = vector::borrow(&registry.escrows, i);
            if (escrow.id == escrow_id) {
                return escrow
            };
            i = i + 1;
        };
        
        abort E_ESCROW_NOT_FOUND
    }

    fun get_escrow_mut(registry: &mut EscrowRegistry, escrow_id: u64): &mut EscrowAgreement {
        let i = 0;
        let len = vector::length(&registry.escrows);
        
        while (i < len) {
            let escrow = vector::borrow_mut(&mut registry.escrows, i);
            if (escrow.id == escrow_id) {
                return escrow
            };
            i = i + 1;
        };
        
        abort E_ESCROW_NOT_FOUND
    }

    /// Get the resource account signer using the stored capability
    fun get_resource_account_signer(resource_account_address: address): signer acquires ResourceAccountCap {
        let resource_cap = borrow_global<ResourceAccountCap>(resource_account_address);
        account::create_signer_with_capability(&resource_cap.signer_cap)
    }

    /// Get the resource account address (public view function)
    #[view]
    public fun get_resource_account_address(): address acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@rent_escrow_addr);
        registry.resource_account_address
    }

    /// Check the USDC balance of the resource account
    #[view]
    public fun get_contract_usdc_balance(usdc_metadata: Object<Metadata>): u64 acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@rent_escrow_addr);
        primary_fungible_store::balance(registry.resource_account_address, usdc_metadata)
    }

    // ======================== Admin Functions ========================

    /// Update platform treasury address (only callable by current treasury)
    public entry fun update_platform_treasury(
        current_treasury: &signer,
        new_treasury: address,
    ) acquires EscrowRegistry {
        let registry = borrow_global_mut<EscrowRegistry>(@rent_escrow_addr);
        assert!(signer::address_of(current_treasury) == registry.platform_treasury, E_NOT_AUTHORIZED);
        
        registry.platform_treasury = new_treasury;
    }

    #[view]
    public fun get_platform_treasury(): address acquires EscrowRegistry {
        let registry = borrow_global<EscrowRegistry>(@rent_escrow_addr);
        registry.platform_treasury
    }
}