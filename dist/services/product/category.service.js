import { Category } from "../../model/relations.js";
import slugify from "slugify";
export const createCategory = async (name, parentId, level) => {
    const slug = slugify(name, { lower: true, strict: true });
    const cat = await Category.create({ name, slug, parentId, level });
    return cat;
};
export const getAllCategories = async ({ level, parentId, }) => {
    const where = { isActive: true };
    // Filter by level if provided
    if (level !== undefined) {
        where.level = level;
    }
    // Filter by parent category if provided
    if (parentId !== undefined) {
        where.parentId = parentId;
    }
    return Category.findAll({
        where,
        order: [
            ["level", "ASC"],
            ["name", "ASC"],
        ],
    });
};
export const getCategoryById = async (id) => Category.findByPk(id);
export const updateCategory = async (id, payload) => Category.update(payload, { where: { id }, returning: true }).then((r) => r[1][0]);
export const deleteCategory = async (id) => Category.destroy({ where: { id } });
