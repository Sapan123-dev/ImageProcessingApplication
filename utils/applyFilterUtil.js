const sharp = require('sharp');

// Apply image filter
const applyFilter = async (filePath, filter) => {
    let image = sharp(filePath);

    switch (filter) {
        case 'grayscale':
            image = image.grayscale();
            break;
        case 'sepia':
            image = image.modulate({ saturation: 0.3 }).tint({ r: 112, g: 66, b: 20 });
            break;
        case 'blur':
            image = image.blur(5);
            break;
        case 'sharpen':
            image = image.sharpen();
            break;
        case 'invert':
            image = image.negate();
            break;
        case 'emboss': 
            image = image.convolve({
                width: 3,
                height: 3,
                kernel: [-2, -1, 0, -1, 1, 1, 0, 1, 2]
            });
            break;
        case 'edge-detection':
            image = image.convolve({
                width: 3,
                height: 3,
                kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
            });
            break;
        default:
            throw new Error('Invalid filter');
    }

    return image.toBuffer();
};

module.exports = { applyFilter };
