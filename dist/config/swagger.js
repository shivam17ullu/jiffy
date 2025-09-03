import swaggerAutogen from "swagger-autogen";
const doc = {
    info: {
        title: "Jiffy API",
        description: "API Docs",
    },
    host: "localhost:3000",
    schemes: ["http"],
};
const outputFile = "./src/config/swagger-output.json";
const endpointsFiles = ["./src/index.ts"]; // entry point where routes are used
swaggerAutogen()(outputFile, endpointsFiles, doc);
