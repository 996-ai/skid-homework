import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpApi from "i18next-http-backend";

i18n
  // Use the i18next-http-backend plugin to load translations from a server.
  // This is the key to lazy loading.
  .use(HttpApi)

  // Pass the i18n instance to react-i18next.
  // This makes the i18n instance available to all your components.
  .use(initReactI18next)
  // .use(
  //   new LanguageDetector(undefined, {
  //     order: ["navigator"],
  //   }),
  // )

  // Initialize i18next.
  // For all options read: https://www.i18next.com/overview/configuration-options
  .init({
    // Set a fallback language for cases where a translation is missing in the current language.
    fallbackLng: "en",

    // Define the namespaces you will use.
    // These correspond to your JSON file names (e.g., actions.json, upload-info.json).
    // i18next will lazy load these namespaces as needed.
    ns: ["commons"],

    // Set the default namespace.
    defaultNS: "commons",

    debug: false,

    interpolation: {
      // React already handles XSS protection, so we can disable this for i18next.
      escapeValue: false,
    },

    // Configuration for the `i18next-http-backend` plugin.
    backend: {
      // This is the path to your translation files.
      // `{{lng}}` will be replaced with the current language code (e.g., 'en', 'zh').
      // `{{ns}}` will be replaced with the namespace (e.g., 'actions', 'upload-info').
      // Since your files are in `public/locales`, the URL will be `/locales/...`
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
  });

export default i18n;
