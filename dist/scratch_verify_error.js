import { UniqueConstraintError, ValidationErrorItem } from "sequelize";
import { resolveError } from "./utils/errorCatalog.js";
// Helper to construct a mock instance with a constructor name
function createMockInstance(className) {
    class MockModel {
    }
    Object.defineProperty(MockModel, "name", { value: className });
    const instance = new MockModel();
    return instance;
}
const errors = [
    new UniqueConstraintError({
        errors: [
            new ValidationErrorItem("slug must be unique", "unique violation", "slug", "my-product-slug", createMockInstance("Product"), "", "", [])
        ]
    }),
    new UniqueConstraintError({
        errors: [
            new ValidationErrorItem("slug must be unique", "unique violation", "slug", "my-category-slug", createMockInstance("Category"), "", "", [])
        ]
    }),
    new UniqueConstraintError({
        errors: [
            new ValidationErrorItem("email must be unique", "unique violation", "email", "test@example.com", createMockInstance("User"), "", "", [])
        ]
    }),
    new UniqueConstraintError({
        errors: [
            new ValidationErrorItem("phone_number must be unique", "unique violation", "phone_number", "1234567890", createMockInstance("User"), "", "", [])
        ]
    }),
    new UniqueConstraintError({
        errors: [
            new ValidationErrorItem("productId must be unique", "unique violation", "productId", "1", createMockInstance("Wishlist"), "", "", [])
        ]
    }),
    new UniqueConstraintError({
        errors: [
            new ValidationErrorItem("some_random_field must be unique", "unique violation", "some_random_field", "value", null, "", "", [])
        ]
    }),
];
errors.forEach((err, idx) => {
    const resolved = resolveError(err);
    console.log(`Test case ${idx + 1} resolved error:`, resolved);
});
