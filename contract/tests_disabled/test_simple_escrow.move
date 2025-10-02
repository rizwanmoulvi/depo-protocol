module rent_escrow_addr::test_simple_escrow {
    use std::string;
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::object;
    use aptos_framework::fungible_asset::Metadata;
    use rent_escrow_addr::rent_escrow_aave;

    #[test(deployer = @rent_escrow_addr, landlord = @0x123, tenant = @0x456)]
    public fun test_simple_escrow_flow(
        deployer: &signer,
        landlord: &signer, 
        tenant: &signer
    ) {
        // Initialize timestamp
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        // Initialize the escrow system
        rent_escrow::initialize(deployer);
        
        // Create escrow (landlord)
        let property_name = string::utf8(b"Beautiful Apartment");
        let property_address = string::utf8(b"123 Main St, City");
        let security_deposit = 1000_000000; // 1000 USDC
        let monthly_rent = 2000_000000; // 2000 USDC
        let start_date = timestamp::now_seconds() + 86400; // Tomorrow
        let end_date = start_date + (30 * 86400); // 30 days later
        
        rent_escrow::create_escrow(
            landlord,
            signer::address_of(tenant),
            property_name,
            property_address,
            security_deposit,
            monthly_rent,
            start_date,
            end_date,
        );

        // Verify escrow was created
        let (
            id,
            escrow_landlord,
            escrow_tenant,
            _property_name,
            _property_address,
            escrow_security_deposit,
            escrow_monthly_rent,
            _start_date,
            _end_date,
            landlord_signed,
            tenant_signed,
            deposited_amount,
            settled,
            _created_at
        ) = rent_escrow::get_escrow(1);

        assert!(id == 1, 0);
        assert!(escrow_landlord == signer::address_of(landlord), 1);
        assert!(escrow_tenant == signer::address_of(tenant), 2);
        assert!(escrow_security_deposit == security_deposit, 3);
        assert!(escrow_monthly_rent == monthly_rent, 4);
        assert!(landlord_signed == true, 5);
        assert!(tenant_signed == false, 6);
        assert!(deposited_amount == 0, 7);
        assert!(settled == false, 8);

        // Tenant signs escrow
        rent_escrow::sign_escrow(tenant, 1);

        // Verify tenant has signed
        let (_, _, _, _, _, _, _, _, _, landlord_signed_2, tenant_signed_2, deposited_amount_2, settled_2, _) = rent_escrow::get_escrow(1);
        assert!(landlord_signed_2 == true, 9);
        assert!(tenant_signed_2 == true, 10);
        assert!(deposited_amount_2 == 0, 11);
        assert!(settled_2 == false, 12);

        // Note: We can't test deposit_funds without actual USDC setup
        // That will be tested in the frontend integration
    }

    #[test(deployer = @rent_escrow_addr)]
    public fun test_resource_account_setup(
        deployer: &signer
    ) {
        // Initialize timestamp
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        // Initialize the escrow system
        rent_escrow::initialize(deployer);
        
        // Verify resource account was created
        let resource_account_address = rent_escrow::get_resource_account_address();
        assert!(resource_account_address != @0x0, 0);
        assert!(resource_account_address != signer::address_of(deployer), 1);

        // Verify platform treasury is set
        let treasury = rent_escrow::get_platform_treasury();
        assert!(treasury == signer::address_of(deployer), 2);
    }

    #[test(deployer = @rent_escrow_addr, landlord1 = @0x123, landlord2 = @0x456, tenant1 = @0x789, tenant2 = @0xabc)]
    public fun test_multiple_escrows(
        deployer: &signer,
        landlord1: &signer,
        landlord2: &signer,
        tenant1: &signer,
        tenant2: &signer
    ) {
        // Initialize timestamp
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        // Initialize the escrow system
        rent_escrow::initialize(deployer);
        
        let property_name = string::utf8(b"Test Property");
        let property_address = string::utf8(b"Test Address");
        let security_deposit = 1000_000000;
        let monthly_rent = 2000_000000;
        let start_date = timestamp::now_seconds() + 86400;
        let end_date = start_date + (30 * 86400);
        
        // Create multiple escrows
        rent_escrow::create_escrow(
            landlord1,
            signer::address_of(tenant1),
            property_name,
            property_address,
            security_deposit,
            monthly_rent,
            start_date,
            end_date,
        );
        
        rent_escrow::create_escrow(
            landlord2,
            signer::address_of(tenant2),
            property_name,
            property_address,
            security_deposit,
            monthly_rent,
            start_date,
            end_date,
        );
        
        rent_escrow::create_escrow(
            landlord1,
            signer::address_of(tenant2),
            property_name,
            property_address,
            security_deposit,
            monthly_rent,
            start_date,
            end_date,
        );

        // Test landlord escrow queries
        let landlord1_escrows = rent_escrow::get_escrows_by_landlord(signer::address_of(landlord1));
        let landlord2_escrows = rent_escrow::get_escrows_by_landlord(signer::address_of(landlord2));
        
        assert!(vector::length(&landlord1_escrows) == 2, 0); // Escrows 1 and 3
        assert!(vector::length(&landlord2_escrows) == 1, 1); // Escrow 2
        
        // Test tenant escrow queries
        let tenant1_escrows = rent_escrow::get_escrows_by_tenant(signer::address_of(tenant1));
        let tenant2_escrows = rent_escrow::get_escrows_by_tenant(signer::address_of(tenant2));
        
        assert!(vector::length(&tenant1_escrows) == 1, 2); // Escrow 1
        assert!(vector::length(&tenant2_escrows) == 2, 3); // Escrows 2 and 3
    }
}