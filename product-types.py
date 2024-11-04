import json
import matplotlib.pyplot as plt
import pandas as pd


file_path = './pk9gear.json'
with open(file_path, 'r') as f:
    orders_data = json.load(f)


def is_not_shipping_protection(item):
    product_type = item['node']['product']['productType'].lower()
    product_title = item['node']['title'].lower()
    return 'shipping' not in product_type and 'protection' not in product_type and 'insurance' not in product_type and 'shipping' not in product_title and 'protection' not in product_title and 'insurance' not in product_title

# Define a function to filter out shipping protection products
def is_not_shipping_protection(item):
    product_type = item['node']['product']['productType'].lower()
    return 'shipping' not in product_type and 'protection' not in product_type

# Extract the product types from the orders, excluding shipping protection products
product_types = []

for order in orders_data:
    for item in order['lineItems']['edges']:
        if is_not_shipping_protection(item):
            product_types.append(item['node']['product']['productType'])

# Count occurrences of each product type
product_type_counts = pd.Series(product_types).value_counts()

# Define colors: the top 3 categories in shades of green, and the rest in shades of light gray
colors = ['#cbf09c', '#a0d68b', '#7c9f5e'] + ['#d3d3d3'] * (len(product_type_counts) - 3)

# Create the pie chart
fig, ax = plt.subplots(figsize=(8, 8))

# Labels for top 4 categories only, others will have no label
labels = product_type_counts.index[:4].tolist() + [''] * (len(product_type_counts) - 4)

# Plot the pie chart
wedges, texts, autotexts = ax.pie(product_type_counts, labels=labels, autopct='%1.1f%%', 
                                  startangle=140, colors=colors, textprops={'fontsize': 18})

# Set the title
ax.set_title("Distribution of Sales Across Product Types", fontsize=18)

# Add a legend box for the full list of product types
ax.legend(wedges, [f'{ptype}: {p:.1f}%' for ptype, p in zip(product_type_counts.index, (product_type_counts / product_type_counts.sum()) * 100)],
          title="Product Types", loc="center left", bbox_to_anchor=(1, 0, 0.5, 0), fontsize=12)

plt.show()