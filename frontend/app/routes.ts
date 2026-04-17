import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/about", "routes/about.tsx"),
  route("/electricity-concepts", "routes/electricity-concepts.tsx"),
  route("/teams", "routes/teams.tsx"),
  route("/login", "routes/login.tsx"),
  route("/signup", "routes/signup.tsx"),
  route("/reset-password", "routes/reset-password.tsx"),
  route("/projects", "routes/projects.tsx"),
  route("/projects/:id", "routes/project.tsx"),
] satisfies RouteConfig;
