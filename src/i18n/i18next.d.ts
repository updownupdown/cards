import "i18next";
import type { RESOURCES } from "./resources";

// Type-checks translation keys against the English resources.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: (typeof RESOURCES)["en"];
  }
}
