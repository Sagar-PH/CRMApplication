import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';

interface PurchaseRow {
  productName: string;
  purchased: number;
  sold: number;
  balance: number;
  reorderLevel: number;
}

interface SalesRow {
  productName: string;
  units_sold: number;
  revenue: number;
  revenue_growth: number;
  trend: 'Rising' | 'Falling' | 'Stable';
}

interface InventoryRow {
  productId: string;
  product_name: string;
  current_stock: number;
  sold_units: number;
  purchased_units: number;
  inventory_status: string;
}

interface ForecastRow {
  productName: string;
  productId: string;
  forecast_revenue: number;
  months_used: number;
  confidence: 'Low' | 'Medium' | 'High';
}

interface ReorderRow {
  productName: string;
  productId: string;
  recommended_qty: number;
  reason: string;
}

@Component({
  selector: 'app-analytics',
  imports: [FormsModule, CommonModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent {
  months = 3;

  salesTable: SalesRow[] = [];
  purchaseTable: PurchaseRow[] = [];
  inventoryRiskProducts: InventoryRow[] = [];
  forecastTable: ForecastRow[] = [];
  reorderTable: ReorderRow[] = [];

  kpis = {
    totalRevenue: 0,
    revenueGrowth: 0,
    revenueTrend: 'Stable',
    totalUnits: 0,
    unitsGrowth: 0,
    unitsTrend: 'Stable',
    avgUnitsPerMonth: 0,
    topProduct: { name: '-', revenue: 0, contribution: 0 },
    riskCount: 0,
    inventoryRisk: { high: 0, medium: 0, low: 0 },
    forecastRevenue: 0,
    forecastConfidence: 'Low',
    reorderCount: 0
  };

  async ngOnInit() {
    await this.loadReports();
  }

  async loadReports() {
    await Promise.all([
      this.loadTables(),
      this.loadSalesTrends(),
      this.loadTopProducts(),
      // this.loadSalesVsPurchase(),
      this.loadInventoryRisk(),
      this.loadSalesForecast(),
      this.loadReorderSuggestions()
    ]);
  }

  // ---------------- Tables ----------------
  async loadTables() {
    const salesRes = await fetch(`http://localhost:8080/analytics/sales-trends?months=${this.months}`, {
      credentials: 'include'
    });
    const salesData = await salesRes.json();
    console.log('sss', salesData)

    this.salesTable = salesData.map((p: any) => ({
      productName: p.productName,
      units_sold: p.current_period.units,
      revenue: p.current_period.revenue,
      revenue_growth: p.revenue_growth,
      trend: p.revenue_trend
    }));

    const purchaseRes = await fetch(`http://localhost:8080/analytics/sales-vs-purchase?months=${this.months}`, {
      credentials: 'include'
    });
    const purchaseData = await purchaseRes.json();

    this.purchaseTable = purchaseData.map((p: any) => ({
      productName: p.productName,
      purchased: p.purchased_units,
      sold: p.sold_units,
      balance: p.purchased_units - p.sold_units,
      reorderLevel: p.reorder_level || 20
    }));
  }

  // ---------------- KPI Charts ----------------
  async loadSalesTrends() {
    const res = await fetch(`http://localhost:8080/analytics/sales-trends?months=${this.months}`, {
      credentials: 'include'
    });
    const data = await res.json();

    this.kpis.totalRevenue = data.reduce((s: any, p: any) => s + p.current_period.revenue, 0);
    this.kpis.totalUnits = data.reduce((s: any, p: any) => s + p.current_period.units, 0);

    new Chart('salesTrendChart', {
      type: 'line',
      data: {
        labels: data.map((d: any) => d.productId),
        datasets: [{
          label: 'Revenue Growth %',
          data: data.map((d: any) => d.revenue_growth),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          tension: 0.4
        }]
      }
    });
  }

  async loadTopProducts() {
    const res = await fetch(`http://localhost:8080/analytics/top-products?months=${this.months}`, {
      credentials: 'include'
    });
    const data = await res.json();

    if (data.length > 0) {
      const top = data[0];
      const totalRevenue = data.reduce((sum: any, p: any) => sum + p.product_revenue, 0);

      this.kpis.topProduct = {
        name: top._id,  // or top.product_name if available
        revenue: top.product_revenue,
        contribution: totalRevenue ? +(top.product_revenue / totalRevenue * 100).toFixed(2) : 0
      };
    } else {
      this.kpis.topProduct = { name: '-', revenue: 0, contribution: 0 };
    }

    new Chart('topProductsChart', {
      type: 'bar',
      data: {
        labels: data.map((d: any) => d._id),
        datasets: [{
          label: 'Revenue',
          data: data.map((d: any) => d.product_revenue),
          backgroundColor: '#2196F3'
        }]
      }
    });
  }

  async loadSalesVsPurchase() {
    const res = await fetch(`http://localhost:8080/analytics/sales-vs-purchase?months=${this.months}`, {
      credentials: 'include'
    });
    const data = await res.json();

    new Chart('salesVsPurchaseChart', {
      type: 'bar',
      data: {
        labels: data.map((d: any) => d.productId),
        datasets: [
          { label: 'Sold', data: data.map((d: any) => d.sold_units), backgroundColor: '#FF9800' },
          { label: 'Purchased', data: data.map((d: any) => d.purchased_units), backgroundColor: '#4CAF50' }
        ]
      }
    });
  }

  // ---------------- Inventory Risk ----------------
  async loadInventoryRisk() {
    try {
      const res = await fetch(`http://localhost:8080/inventory-risk?months=${this.months}`, {
        credentials: 'include'
      });
      const productsData: any[] = await res.json();

      this.inventoryRiskProducts = productsData.map(p => ({
        productId: p.productId,
        product_name: p.product_name,
        current_stock: p.current_stock,
        sold_units: p.sold_units,
        purchased_units: p.purchased_units,
        inventory_status: p.inventory_status
      }));

      this.kpis.riskCount = this.inventoryRiskProducts.filter(
        p => p.inventory_status === 'Stockout Risk'
      ).length;

      this.kpis.inventoryRisk = {
        high: this.inventoryRiskProducts.filter(p => p.inventory_status === 'Stockout Risk').length,
        medium: this.inventoryRiskProducts.filter(p => p.inventory_status === 'Stable').length,
        low: this.inventoryRiskProducts.filter(p => p.inventory_status === 'Overstock Risk').length
      };
    } catch (err) {
      console.error('Failed to load inventory risk', err);
    }
  }

  // ---------------- Sales Forecast ----------------
  async loadSalesForecast() {
    try {
      const res = await fetch(`http://localhost:8080/forecast?months=${this.months}`, {
        credentials: 'include'
      });
      const data: ForecastRow[] = await res.json();
      console.log(data)

      this.forecastTable = data;

      // KPI
      this.kpis.forecastRevenue = data.reduce((sum, d: any) => sum + parseFloat(d.forecast_revenue), 0);
      this.kpis.forecastConfidence = data.length ? data[0].confidence : 'Low';

      new Chart('forecastChart', {
        type: 'line',
        data: {
          labels: data.map(d => d.productId),
          datasets: [{
            label: 'Forecast Revenue',
            data: data.map((d: any) => parseFloat(d.forecast_revenue)),
            borderColor: '#FF5722',
            backgroundColor: 'rgba(255,87,34,0.2)',
            tension: 0.4
          }]
        }
      });
    } catch (err) {
      console.error('Failed to load sales forecast', err);
    }
  }

  // ---------------- Reorder Suggestions ----------------
  async loadReorderSuggestions() {
    try {
      const res = await fetch(`http://localhost:8080/reorder-suggestions?months=${this.months}`, {
        credentials: 'include'
      });
      const data: ReorderRow[] = await res.json();

      this.reorderTable = data;
      this.kpis.reorderCount = data.filter(d => d.recommended_qty > 0).length;
    } catch (err) {
      console.error('Failed to load reorder suggestions', err);
    }
  }
}
