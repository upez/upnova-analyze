import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());

// Helper functions
function isNotShippingProtection(item: any): boolean {
    const product = item.node?.product;
    if (!product) return true;
    const productType = product.productType?.toLowerCase() || '';
    const productTitle = item.node?.title?.toLowerCase() || '';
    return !['shipping', 'protection', 'insurance'].some(term => 
        productType.includes(term) || productTitle.includes(term)
    );
}

function processOrderSizes(data: any[]): Record<string, number> {
    const orderSizes = data.map(order => 
        order.lineItems.edges.reduce((sum: number, item: any) => 
            sum + (isNotShippingProtection(item) ? item.node.quantity : 0), 0)
    );
    const orderSizeCounts = orderSizes.reduce((acc: Record<string, number>, size: number) => {
        acc[size] = (acc[size] || 0) + 1;
        return acc;
    }, {});
    return orderSizeCounts;
}

function processPriceRanges(data: any[]): Record<string, number> {
    const totalPrices = data.map(order => parseFloat(order.totalPriceSet.shopMoney.amount)).sort((a, b) => a - b);
    const percentile90 = totalPrices[Math.floor(totalPrices.length * 0.9)];
    const maxPrice = Math.ceil(percentile90 / 10) * 10;
    const minPrice = Math.floor(Math.min(...totalPrices) / 10) * 10;
    const bins = Array.from({ length: 8 }, (_, i) => minPrice + i * (maxPrice - minPrice) / 7);
    const labels = bins.slice(0, -1).map((bin, i) => `$${Math.floor(bin)}-$${Math.floor(bins[i + 1])}`);
    const priceRangeCounts = totalPrices.reduce((acc: Record<string, number>, price: number) => {
        const index = bins.findIndex((bin, i) => price >= bin && price < bins[i + 1]);
        if (index !== -1) {
            acc[labels[index]] = (acc[labels[index]] || 0) + 1;
        }
        return acc;
    }, {});
    return priceRangeCounts;
}

function processProductCategories(data: any[]): Record<string, number> {
    const categories = data.flatMap(order => 
        order.lineItems.edges
            .filter(isNotShippingProtection)
            .map((item: any) => item.node.product?.category?.name || 'Unknown')
    );
    const categoryCounts = categories.reduce((acc: Record<string, number>, category: string) => {
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});
    return categoryCounts;
}

function processProductTypes(data: any[]): Record<string, number> {
    const productTypes = data.flatMap(order => 
        order.lineItems.edges
            .filter(isNotShippingProtection)
            .map((item: any) => item.node.product?.productType || 'Undefined')
    );
    const productTypeCounts = productTypes.reduce((acc: Record<string, number>, type: string) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
    return productTypeCounts;
}

app.post('/upload', upload.single('file'), (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file part' });
        return;
    }
    if (req.file.mimetype !== 'application/json') {
        res.status(400).json({ error: 'Invalid file type' });
        return;
    }
    const data = JSON.parse(fs.readFileSync(req.file.path, 'utf-8'));
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

app.post('/upload-json', upload.array('jsonFiles'), (req: Request, res: Response) => {
    if (!req.files || !Array.isArray(req.files)) {
        res.status(400).json({ error: 'No files were uploaded.' });
        return;
    }

    const mergedData: any[] = [];
    for (const file of req.files) {
        const data = JSON.parse(fs.readFileSync(file.path, 'utf-8'));
        if (Array.isArray(data)) {
            mergedData.push(...data);
        } else {
            res.status(400).json({ error: 'Each JSON file must contain an array.' });
            return ;
        }
    }

    const mergedFilePath = path.join(__dirname, 'merged.json');
    fs.writeFileSync(mergedFilePath, JSON.stringify(mergedData, null, 2));

    res.download(mergedFilePath, 'merged.json');
});

app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/merge', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../merge.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
