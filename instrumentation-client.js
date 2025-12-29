import posthog from "posthog-js";

posthog.init("phc_PyXlCPW6bLHQAMX3W9ZuURqmhvpsYe3yqhTl6ObKhYL", {
  api_host: "https://us.i.posthog.com",
  defaults: "2025-11-30",
  persistence: "memory", // This disables Cookies/LocalStorage
});
