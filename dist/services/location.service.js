import Location from "../model/profile/location.js";
class LocationService {
    // CREATE location
    static async createLocation(data) {
        // if isDefault == true → unset others
        if (data.isDefault) {
            await Location.update({ isDefault: false }, { where: { userId: data.userId } });
        }
        return await Location.create(data);
    }
    // GET all locations for a user
    static async getUserLocations(userId) {
        return await Location.findAll({
            where: { userId },
            order: [["isDefault", "DESC"]],
        });
    }
    // GET one location
    static async getLocation(id, userId) {
        return await Location.findOne({ where: { id, userId } });
    }
    // UPDATE
    static async updateLocation(id, userId, data) {
        if (data.isDefault === true) {
            await Location.update({ isDefault: false }, { where: { userId } });
        }
        await Location.update(data, { where: { id, userId } });
        return await Location.findByPk(id);
    }
    // DELETE
    static async deleteLocation(id, userId) {
        return await Location.destroy({ where: { id, userId } });
    }
}
export default LocationService;
