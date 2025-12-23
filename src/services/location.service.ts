import Location from "../model/profile/location.js";

class LocationService {
  // CREATE location
  static async createLocation(data: any) {
    // if isDefault == true → unset others
    if (data.isDefault) {
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

  // UPDATE
  static async updateLocation(id: number, userId: number, data: any) {
    if (data.isDefault === true) {
      await Location.update(
        { isDefault: false },
        { where: { userId } }
      );
    }

    await Location.update(data, { where: { id, userId } });
    return await Location.findByPk(id);
  }

  // DELETE
  static async deleteLocation(id: number, userId: number) {
    return await Location.destroy({ where: { id, userId } });
  }
}

export default LocationService;
