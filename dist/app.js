"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
app.use(body_parser_1.default.json());
// Helper functions
function isNotShippingProtection(item) {
    var _a, _b, _c, _d;
    const product = (_a = item.node) === null || _a === void 0 ? void 0 : _a.product;
    if (!product)
        return true;
    const productType = ((_b = product.productType) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
    const productTitle = ((_d = (_c = item.node) === null || _c === void 0 ? void 0 : _c.title) === null || _d === void 0 ? void 0 : _d.toLowerCase()) || '';
    return !['shipping', 'protection', 'insurance'].some(term => productType.includes(term) || productTitle.includes(term));
}
function processOrderSizes(data) {
    const orderSizes = data.map(order => order.lineItems.edges.reduce((sum, item) => sum + (isNotShippingProtection(item) ? item.node.quantity : 0), 0));
    const orderSizeCounts = orderSizes.reduce((acc, size) => {
        acc[size] = (acc[size] || 0) + 1;
        return acc;
    }, {});
    return orderSizeCounts;
}
function processPriceRanges(data) {
    const totalPrices = data.map(order => parseFloat(order.totalPriceSet.shopMoney.amount)).sort((a, b) => a - b);
    const percentile90 = totalPrices[Math.floor(totalPrices.length * 0.9)];
    const maxPrice = Math.ceil(percentile90 / 10) * 10;
    const minPrice = Math.floor(Math.min(...totalPrices) / 10) * 10;
    const bins = Array.from({ length: 8 }, (_, i) => minPrice + i * (maxPrice - minPrice) / 7);
    const labels = bins.slice(0, -1).map((bin, i) => `$${Math.floor(bin)}-$${Math.floor(bins[i + 1])}`);
    const priceRangeCounts = totalPrices.reduce((acc, price) => {
        const index = bins.findIndex((bin, i) => price >= bin && price < bins[i + 1]);
        if (index !== -1) {
            acc[labels[index]] = (acc[labels[index]] || 0) + 1;
        }
        return acc;
    }, {});
    return priceRangeCounts;
}
function processProductCategories(data) {
    const categories = data.flatMap(order => order.lineItems.edges
        .filter(isNotShippingProtection)
        .map((item) => { var _a, _b; return ((_b = (_a = item.node.product) === null || _a === void 0 ? void 0 : _a.category) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown'; }));
    const categoryCounts = categories.reduce((acc, category) => {
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});
    return categoryCounts;
}
function processProductTypes(data) {
    const productTypes = data.flatMap(order => order.lineItems.edges
        .filter(isNotShippingProtection)
        .map((item) => { var _a; return ((_a = item.node.product) === null || _a === void 0 ? void 0 : _a.productType) || 'Undefined'; }));
    const productTypeCounts = productTypes.reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
    return productTypeCounts;
}
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file part' });
        return;
    }
    if (req.file.mimetype !== 'application/json') {
        res.status(400).json({ error: 'Invalid file type' });
        return;
    }
    const data = JSON.parse(fs_1.default.readFileSync(req.file.path, 'utf-8'));
    const orderSizes = processOrderSizes(data);
    const priceRanges = processPriceRanges(data);
    const productCategories = processProductCategories(data);
    const productTypes = processProductTypes(data);
    res.json({
        order_sizes: orderSizes,
        price_ranges: priceRanges,
        product_categories: productCategories,
        product_types: productTypes
    });
});
app.post('/upload-json', upload.array('jsonFiles'), (req, res) => {
    if (!req.files || !Array.isArray(req.files)) {
        res.status(400).json({ error: 'No files were uploaded.' });
        return;
    }
    const mergedData = [];
    for (const file of req.files) {
        const data = JSON.parse(fs_1.default.readFileSync(file.path, 'utf-8'));
        if (Array.isArray(data)) {
            mergedData.push(...data);
        }
        else {
            res.status(400).json({ error: 'Each JSON file must contain an array.' });
            return;
        }
    }
    const mergedFilePath = path_1.default.join(__dirname, 'merged.json');
    fs_1.default.writeFileSync(mergedFilePath, JSON.stringify(mergedData, null, 2));
    res.download(mergedFilePath, 'merged.json');
});
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../index.html'));
});
app.get('/merge', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../merge.html'));
});
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
