import json
import matplotlib.pyplot as plt
import pandas as pd

# Load the data from the uploaded JSON file
file_path = '/Users/sonchu/Projects/upez-analyze/pk9gear.json'
with open(file_path, 'r') as f:
    orders_data = json.load(f)

def is_not_shipping_protection(item):
    product = item['node'].get('product')
    if not product:
        return True  # Assume it's not shipping protection if product info is missing
    
    product_type = product.get('productType', '').lower()
    product_title = item['node'].get('title', '').lower()
    
    return ('shipping' not in product_type and 'protection' not in product_type and
            'insurance' not in product_type and 'shipping' not in product_title and
            'protection' not in product_title and 'insurance' not in product_title)

# Extract the order size (number of line items in each order)
order_sizes = []
for order in orders_data:
    order_size = sum(item['node']['quantity'] for item in order['lineItems']['edges'] if is_not_shipping_protection(item)) 
    order_sizes.append(order_size)

# Count occurrences of each order size
order_size_counts = pd.Series(order_sizes).value_counts().sort_index()

colors = ['#cbf09c', '#a0d68b', '#7c9f5e'] + ['#d3d3d3'] * (len(order_size_counts) - 3)


# Create the pie chart with a legend box as per user preferences
fig, ax = plt.subplots(figsize=(14, 8))

# Plot the pie chart
wedges, texts, autotexts = ax.pie(order_size_counts, labels=order_size_counts.index, autopct='%1.1f%%', 
                                  startangle=140, colors=colors, textprops={'fontsize': 18})

# Set the title
ax.set_title("Differences in Order Sizes\n(Number of Items per Order)", fontsize=22)

# Add a legend box next to the chart with percentages
ax.legend(wedges, [f'{i} items: {p:.1f}%' for i, p in zip(order_size_counts.index, (order_size_counts / order_size_counts.sum()) * 100)],
          title="Order Size", loc="center left", bbox_to_anchor=(1, 0, 0.5, 1), fontsize=12)


# Create a pie chart with user preferences
plt.pie(order_size_counts, labels=order_size_counts.index, autopct='%1.1f%%', startangle=140, 
        colors=colors, textprops={'fontsize': 18})
plt.title("Differences in Order Sizes\n(Number of Items per Order)", fontsize=22)
plt.show()
