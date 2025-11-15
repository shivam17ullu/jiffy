import seedRoles from "./seedRoles.js";
import seedUsers from "./seedUsers.js";
import seedCategories from "./seedCategory.js";
import seedProducts from "./seedProduct.js";
async function seedAll() {
    try {
        console.log("🚀 Starting complete database seeding...\n");
        // Step 1: Seed Roles
        console.log("📋 Step 1/4: Seeding Roles");
        console.log("─".repeat(50));
        await seedRoles();
        console.log("");
        // Step 2: Seed Categories
        console.log("📋 Step 2/4: Seeding Categories");
        console.log("─".repeat(50));
        await seedCategories();
        console.log("");
        // Step 3: Seed Users, Roles, and Seller Profiles
        console.log("📋 Step 3/4: Seeding Users, Roles, and Seller Profiles");
        console.log("─".repeat(50));
        await seedUsers();
        console.log("");
        // Step 4: Seed Products
        console.log("📋 Step 4/4: Seeding Products");
        console.log("─".repeat(50));
        await seedProducts();
        console.log("");
        console.log("🎉 All seeding completed successfully!");
        console.log("\n📊 Database Summary:");
        console.log("   ✅ Roles: admin, seller, buyer");
        console.log("   ✅ Users: admin, 3 sellers, 2 buyers");
        console.log("   ✅ Categories: Men, Women, Kids with subcategories");
        console.log("   ✅ Products: 4 products with variants");
    }
    catch (error) {
        console.error("\n❌ Seeding failed:", error);
        throw error;
    }
}
seedAll()
    .then(() => {
    console.log("\n✅ Complete seed process finished.");
    process.exit(0);
})
    .catch((error) => {
    console.error("\n❌ Complete seed process failed:", error);
    process.exit(1);
});
export default seedAll;
