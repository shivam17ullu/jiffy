import { Category } from "../../model/relations.js";
import slugify from "slugify";
export const createCategory = async (name, parentId, level) => {
    const slug = slugify(name, { lower: true, strict: true });
    const cat = await Category.create({ name, slug, parentId, level });
    return cat;
};
export const getAllCategories = async () => {
    // fetch hierarchical structure (simple approach)
    const cats = await Category.findAll({
        where: { isActive: true },
        order: [
            ["level", "ASC"],
            ["name", "ASC"],
        ],
    });
    return cats;
};
export const getCategoryById = async (id) => Category.findByPk(id);
export const updateCategory = async (id, payload) => Category.update(payload, { where: { id }, returning: true }).then((r) => r[1][0]);
export const deleteCategory = async (id) => Category.destroy({ where: { id } });
