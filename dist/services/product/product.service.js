import { Product, ProductVariant, Category } from "../../model/relations.js";
import slugify from "slugify";
import { jiffy } from "../../config/sequelize.js";
import { Op } from "sequelize";
export const createProduct = async (payload) => {
    const t = await jiffy.transaction();
    try {
        payload.slug =
            payload.slug ||
                slugify(payload.name || "", { lower: true, strict: true });
        const { categories = [], variants = [], images = [], tags = [], ...rest } = payload;
        const p = await Product.create({ ...rest, images, tags }, { transaction: t });
        // attach categories (many-to-many)
        if (categories.length > 0) {
            await p.addCategories(categories, { transaction: t });
        }
        // create variants
        if (variants.length > 0) {
            for (const v of variants) {
                await ProductVariant.create({ ...v, productId: p.id }, { transaction: t });
            }
        }
        await t.commit();
        return await Product.findByPk(p.id, {
            include: ["variants", "categories"],
        });
    }
    catch (err) {
        await t.rollback();
        throw err;
    }
};
export const listProducts = async (opts) => {
    const { page = 1, limit = 20, q, categoryId, minPrice, maxPrice, sort, } = opts;
    const where = { isActive: true };
    if (q)
        where.name = { [Op.iLike]: `%${q}%` };
    // base query
    const include = [
        { association: "variants" },
        { association: "categories" },
    ];
    if (categoryId)
        include.push({ model: Category, where: { id: categoryId } });
    const products = await Product.findAndCountAll({
        where,
        include,
        limit,
        offset: (page - 1) * limit,
        order: sort ? [sort.split(":")] : [["createdAt", "DESC"]],
    });
    return { items: products.rows, total: products.count, page, limit };
};
export const getProductById = async (id) => Product.findByPk(id, { include: ["variants", "categories"] });
export const updateProduct = async (id, payload) => Product.update(payload, { where: { id }, returning: true }).then((r) => r[1][0]);
export const deleteProduct = async (id) => Product.destroy({ where: { id } });
