import Location from "../model/profile/location.js";

class LocationService {
  // CREATE location
  static async createLocation(data: any) {
    const existingCount = await Location.count({ where: { userId: data.userId } });

    // Automatically make it default if it is the user's very first address
    if (existingCount === 0) {
      data.isDefault = true;
    }

    const isDefault = String(data.isDefault) === "true" || data.isDefault === 1 || data.isDefault === true;
    data.isDefault = isDefault;

    // if isDefault == true → unset others
    if (isDefault && existingCount > 0) {
      await Location.update(
        { isDefault: false },
        { where: { userId: data.userId } }
      );
    }

    return await Location.create(data);
  }

  // GET all locations for a user
  static async getUserLocations(userId: number) {
    return await Location.findAll({
      where: { userId },
      order: [["isDefault", "DESC"]],
    });
  }

  // GET one location
  static async getLocation(id: number, userId: number) {
    return await Location.findOne({ where: { id, userId } });
  }

  static async getLocationById(id: number) {
    return await Location.findByPk(id);
  }

  // UPDATE
  static async updateLocation(id: number, userId: number, data: any) {
    const isDefault = String(data.isDefault) === "true" || data.isDefault === 1 || data.isDefault === true;
    if (isDefault) {
      const updateWhere: any = {};
      if (userId && !isNaN(userId)) {
        updateWhere.userId = userId;
      }
      await Location.update(
        { isDefault: false },
        { where: updateWhere }
      );
      data.isDefault = true;
    } else if (data.isDefault !== undefined) {
      data.isDefault = false;
    }

    const where: any = { id };
    if (userId && !isNaN(userId)) {
      where.userId = userId;
    }
    await Location.update(data, { where });
    return await Location.findByPk(id);
  }

  // DELETE
  static async deleteLocation(id: number, userId?: number) {
    const where: any = { id };
    if (userId && !isNaN(userId)) {
      where.userId = userId;
    }
    return await Location.destroy({ where });
  }
}

export default LocationService;
