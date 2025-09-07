module.exports = {
    proxy: "http://localhost:3001",
    files: [
        "./public/**/*.html",
        "./public/**/*.css", 
        "./public/**/*.js"
    ],
    watchOptions: {
        ignoreInitial: true,
        ignored: [
            "node_modules/**",
            "tests/**",
            "*.test.js"
        ]
    },
    port: 3000,
    ui: {
        port: 3002
    },
    open: true,
    notify: false,
    logLevel: "info"
};
