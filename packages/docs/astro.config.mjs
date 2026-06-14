import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://clif.arshadshah.com",
  output: "static",
  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },
  integrations: [
    starlight({
      title: "clif",
      tagline: "Tiny, zero-dependency CLI framework",
      favicon: "/favicon.svg",
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
        // Show the wordmark alongside the icon so the nav reads as
        // "[icon] clif [version-pill]" rather than icon-only.
      },
      components: {
        // Adds a version pill next to the site title, sourced from
        // packages/clif/package.json so it tracks the published version
        // automatically (changesets bumps that file on every release).
        SiteTitle: "./src/components/SiteTitle.astro",
      },
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/arshad-shah/clif" }],
      customCss: ["./src/styles/ember.css"],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", slug: "getting-started/introduction" },
            { label: "Quick Start", slug: "getting-started/quickstart" },
          ],
        },
        {
          label: "Core",
          items: [
            { label: "Colors", slug: "guides/colors" },
            { label: "Arguments", slug: "guides/arguments" },
            { label: "Commands", slug: "guides/commands" },
          ],
        },
        {
          label: "Components",
          items: [
            { label: "Box", slug: "components/box" },
            { label: "Table", slug: "components/table" },
            { label: "List & Tree", slug: "components/list-tree" },
            { label: "Spinner & Progress", slug: "components/spinner-progress" },
            { label: "Tasks", slug: "components/tasks" },
            { label: "Log & Divider", slug: "components/log-divider" },
          ],
        },
        {
          label: "Prompts",
          items: [
            { label: "Text & Password", slug: "components/text-password" },
            { label: "Select & Multiselect", slug: "components/select-multiselect" },
            { label: "Confirm & Number", slug: "components/confirm-number" },
            { label: "Group", slug: "components/group" },
          ],
        },
        {
          label: "API Reference",
          items: [{ label: "Full API", slug: "api/reference" }],
        },
      ],
    }),
  ],
});
