import { Category } from "../../model/relations.js";
import slugify from "slugify";

export const createCategory = async (
  name: string,
  parentId: number | null,
  level: 0 | 1 | 2
) => {
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

export const getCategoryById = async (id: number) => Category.findByPk(id);
export const updateCategory = async (id: number, payload: Partial<any>) =>
  Category.update(payload, { where: { id }, returning: true }).then(
    (r) => r[1][0]
  );
export const deleteCategory = async (id: number) =>
  Category.destroy({ where: { id } });
