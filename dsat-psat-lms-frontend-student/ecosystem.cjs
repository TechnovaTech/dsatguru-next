module.exports = {
  apps: [{
    name: "vite-app",
    script: "npm",
    args: "run preview",
    cwd: "/var/www/react-frontend/dsat-psat-lms-frontend-student",
    env: {
      NODE_ENV: "production"
    }
  }]
}
