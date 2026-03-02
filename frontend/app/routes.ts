import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/login", "routes/login.tsx"),
  route("/signup", "routes/signup.tsx"),
  route("/projects", "routes/projects.tsx"),
  route("/projects/:id", "routes/project.tsx"),
] satisfies RouteConfig;
