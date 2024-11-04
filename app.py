from flask import Flask, jsonify, request, send_from_directory, send_file
import json
import pandas as pd
import numpy as np
import os

app = Flask(__name__)

# Helper functions
def is_not_shipping_protection(item):
    product = item['node'].get('product')
    if not product:
        return True
    product_type = product.get('productType', '').lower()
    product_title = item['node'].get('title', '').lower()
    return ('shipping' not in product_type and 'protection' not in product_type and
            'insurance' not in product_type and 'shipping' not in product_title and
            'protection' not in product_title and 'insurance' not in product_title)

def process_order_sizes(data):
    order_sizes = []
    for order in data:
        order_size = sum(item['node']['quantity'] for item in order['lineItems']['edges'] if is_not_shipping_protection(item))
        order_sizes.append(order_size)
    order_size_counts = pd.Series(order_sizes).value_counts().sort_index()
    return order_size_counts.to_dict()

def process_price_ranges(data):
    total_prices = sorted([float(order['totalPriceSet']['shopMoney']['amount']) for order in data])
    percentile_90 = np.percentile(total_prices, 90)
    max_price = np.ceil(percentile_90 / 10) * 10
    min_price = np.floor(min(total_prices) / 10) * 10
    bins = np.linspace(min_price, max_price, 8)
    labels = [f'${int(bins[i])}-${int(bins[i+1])}' for i in range(len(bins) - 1)]
    price_ranges = pd.cut(total_prices, bins=bins, labels=labels, include_lowest=True)
    price_range_counts = price_ranges.value_counts().sort_index()
    return price_range_counts.to_dict()

def process_product_categories(data):
    categories = []
    for order in data:
        for item in order['lineItems']['edges']:
            if is_not_shipping_protection(item):
                category = item['node']['product'].get('category')
                if category:
                    categories.append(category.get('name', 'Unknown'))
    category_counts = pd.Series(categories).value_counts()
    return category_counts.to_dict()

def process_product_types(data):
    product_types = []
    for order in data:
        for item in order['lineItems']['edges']:
            if is_not_shipping_protection(item):
                product_type = item['node']['product'].get('productType', 'Undefined')
                if not product_type:
                    product_type = 'Undefined'
                product_types.append(product_type)
    product_type_counts = pd.Series(product_types).value_counts()
    return product_type_counts.to_dict()

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and file.filename.endswith('.json'):
        data = json.load(file)
        order_sizes = process_order_sizes(data)
        price_ranges = process_price_ranges(data)
        product_categories = process_product_categories(data)
        product_types = process_product_types(data)
        return jsonify({
            'order_sizes': order_sizes,
            'price_ranges': price_ranges,
            'product_categories': product_categories,
            'product_types': product_types
        }), 200
    else:
        return jsonify({'error': 'Invalid file type'}), 400

@app.route('/upload-json', methods=['POST'])
def upload_json():
    if 'jsonFiles' not in request.files:
        return jsonify({'error': 'No files were uploaded.'}), 400

    files = request.files.getlist('jsonFiles')
    merged_data = []

    for file in files:
        data = json.load(file)
        if isinstance(data, list):
            merged_data.extend(data)
        else:
            return jsonify({'error': 'Each JSON file must contain an array.'}), 400

    merged_file_path = 'merged.json'
    with open(merged_file_path, 'w') as merged_file:
        json.dump(merged_data, merged_file, indent=2)

    return send_file(merged_file_path, as_attachment=True, download_name='merged.json')

@app.route('/')
def serve_frontend():
    return send_from_directory('', 'index.html')

@app.route('/merge')
def serve_merge_page():
    return send_from_directory('', 'merge.html')

if __name__ == '__main__':
    app.run(debug=True)