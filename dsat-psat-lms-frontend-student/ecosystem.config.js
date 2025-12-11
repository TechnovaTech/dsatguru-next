
module.exports = {
  apps: [{
    name: "vite-app",
    script: "npm",
    args: "run preview",
    cwd: "/var/www/react-frontend/dsat-psat-frontend-student", // Replace with your actual path
    env: {
      NODE_ENV: "production"
    }
  }]
}
