const process = require('child_process');

console.log("Installing asset .. ")
process.exec("cp assets/icon.webp public/imgs/logo.webp");
console.log("Scaling icons .. ");
sizes = [ 128, 96, 48, 39, 38, 16 ]
for (let size of sizes) {
    console.log(`Scaling icon ${size} px`);
    process.exec(`convert assets/icon.png -resize ${size}x${size} public/icons/icon${size}.png`, function callback(stdout, stderr) {});
}

console.log("Generating favicon .. ");
process.exec(`convert assets/icon.png -resize 53x53 -format png public/icons/favicon.ico`, function callback(stdout, stderr) {});

