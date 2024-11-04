import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Load the data from the uploaded JSON file
file_path = '/Users/sonchu/Downloads/merged.json'
with open(file_path, 'r') as f:
    orders_data = json.load(f)

# Extract total price of each order
total_prices = sorted([float(order['totalPriceSet']['shopMoney']['amount']) for order in orders_data])

# Determine the 90th percentile as the new max_price (lowest value in the top 10%)
percentile_90 = np.percentile(total_prices, 90)
max_price = np.ceil(percentile_90 / 10) * 10  # Round up to the nearest 10

# Determine the minimum price, rounded down to the nearest 10
min_price = np.floor(min(total_prices) / 10) * 10

# Generate 7 evenly spaced bins between the minimum and new max price
bins = np.linspace(min_price, max_price, 8)  # 8 points create 7 ranges
labels = [f'${int(bins[i])}-${int(bins[i+1])}' for i in range(len(bins) - 1)]

# Categorize orders into price ranges
price_ranges = pd.cut(total_prices, bins=bins, labels=labels, include_lowest=True)

# Count occurrences of each price range
price_range_counts = price_ranges.value_counts().sort_index()

# Convert to percentage
price_range_percentages = (price_range_counts / price_range_counts.sum()) * 100

# Create the bar chart
fig, ax = plt.subplots(figsize=(10, 6))

# Define colors for top 3 highest values and gray for the rest
bar_colors = ['#cbf09c', '#a0d68b', '#7c9f5e'] + ['#d3d3d3'] * (len(price_range_percentages) - 3)

# Plot the bar chart
ax.bar(price_range_percentages.index, price_range_percentages.values, color=bar_colors)

# Set chart title and labels
ax.set_title('Percentage of Orders by Total Price Ranges\n', fontsize=22)
ax.set_xlabel('Price Range', fontsize=16)
ax.set_ylabel('Percentage of Orders (%)', fontsize=16)

plt.show()