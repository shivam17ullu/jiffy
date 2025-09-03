import { Sequelize } from "sequelize";
import UserModel from "../models/user.js";
import RoleModel from "../models/role.js";
import UserRoleModel from "../models/userRole.js";
import OtpLoginModel from "../models/otpLogin.js";
import RefreshTokenModel from "../models/refreshToken.js";

const sequelize = new Sequelize("jiffy", "root", "shivam", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});


const models = {
  User: UserModel(sequelize),
  Role: RoleModel(sequelize),
  UserRole: UserRoleModel(sequelize),
  OtpLogin: OtpLoginModel(sequelize),
  RefreshToken: RefreshTokenModel(sequelize),
};

Object.values(models).forEach((model) => {
  if (model.associate) model.associate(models);
});

export { sequelize };
export default models;
