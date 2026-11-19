import { assertSafeTestEnvironment } from "./test-env.ts";

// Runs inside every test worker before any test file is imported.
assertSafeTestEnvironment(process.env);