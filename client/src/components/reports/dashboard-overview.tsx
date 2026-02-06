import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  Clock,
  ChartBar,
  ArrowUpRight,
  MoreHorizontal,
  Eye,
  ChevronRight,
  Store,
  PieChart as PieChartIcon,
  BarChart3,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { format, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { useLocation } from "wouter";
import type { StoreSettings } from "@shared/schema";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface OrderData {
  id: number;
  orderNumber: string;
  status: string;
  total: string;
  subtotal: string;
  paymentMethod: string;
  orderedAt: string;
  customerId?: number;
  tableId?: number;
  customerCount?: number;
  priceIncludeTax?: boolean; // Added for clarity
  tax?: string; // Added for clarity
  discount?: string; // Added for clarity
}

interface OrderItemData {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

interface DashboardStats {
  totalSalesRevenue: number;
  subtotalRevenue: number;
  estimatedRevenue: number;
  servingRevenue: number;
  cancelledRevenue: number;
  periodOrderCount: number;
  periodCustomerCount: number;
  dailyAverageRevenue: number;
  activeOrders: number;
  completedOrdersCount: number;
  processingOrdersCount: number;
  cancelledOrdersCount: number;
  unpaidOrdersCount: number; // Added for unpaid orders count
  totalOrdersInRange: number;
  dateRange: string;
  paymentMethods: { [key: string]: { count: number; total: number } };
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
    unitPrice: string;
  }>; // Modified to include unitPrice
}

export function DashboardOverview() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("today");

  // Initialize with saved date range from localStorage or today's date
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(
    () => {
      // Fallback to today's date
      const today = new Date();
      const formattedToday = format(today, "yyyy-MM-dd");
      return { start: formattedToday, end: formattedToday };
    },
  );

  // Save date range to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("dashboard-date-range", JSON.stringify(dateRange));
    } catch (error) {
      console.error("Error saving date range:", error);
    }
  }, [dateRange]);

  // Fetch store settings
  const { data: storeSettings } = useQuery<StoreSettings>({
    queryKey: ["https://api-laundry-mobile.edpos.vn/api/store-settings"],
    queryFn: async () => {
      const response = await fetch("https://api-laundry-mobile.edpos.vn/api/store-settings");
      if (!response.ok) {
        throw new Error("Failed to fetch store settings");
      }
      return response.json();
    },
  });

  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const response = await fetch("https://api-laundry-mobile.edpos.vn/api/orders");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      return response.json() as Promise<OrderData[]>;
    },
  });

  // Fetch order items
  const { data: orderItemsData, isLoading: orderItemsLoading } = useQuery({
    queryKey: ["order-items"],
    queryFn: async () => {
      const response = await fetch("https://api-laundry-mobile.edpos.vn/api/order-items");
      if (!response.ok) {
        throw new Error("Failed to fetch order items");
      }
      return response.json() as Promise<OrderItemData[]>;
    },
  });

  // Fetch orders in date range
  const { data: dateRangeOrders } = useQuery({
    queryKey: ["https://api-laundry-mobile.edpos.vn/api/orders/date-range", dateRange.start, dateRange.end],
    queryFn: async () => {
      try {
        console.log(`Dashboard - Date Range Query:`, {
          startDate: dateRange.start,
          endDate: dateRange.end,
          apiUrl: `https://api-laundry-mobile.edpos.vn/api/orders/date-range/${dateRange.start}/${dateRange.end}`,
        });

        const response = await fetch(
          `https://api-laundry-mobile.edpos.vn/api/orders/date-range/${dateRange.start}/${dateRange.end}`,
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        console.log(`Dashboard - Orders received from API:`, {
          count: data?.length || 0,
          sampleOrder: data?.[0]
            ? {
                id: data[0].id,
                orderNumber: data[0].orderNumber,
                orderedAt: data[0].orderedAt,
                createdAt: data[0].createdAt,
                status: data[0].status,
              }
            : null,
        });

        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
      }
    },
    enabled: Boolean(dateRange.start && dateRange.end),
    staleTime: 30000, // Cache for 30 seconds to reduce re-fetching
  });

  // Fetch tables for table statistics
  const { data: tablesData } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      const response = await fetch("https://api-laundry-mobile.edpos.vn/api/tables");
      if (!response.ok) {
        throw new Error("Failed to fetch tables");
      }
      return response.json();
    },
  });

  // Fetch revenue by store
  const { data: storeRevenueData } = useQuery({
    queryKey: ["https://api-laundry-mobile.edpos.vn/api/reports/revenue-by-store", dateRange.start, dateRange.end],
    queryFn: async () => {
      try {
        const response = await fetch(
          `https://api-laundry-mobile.edpos.vn/api/reports/revenue-by-store?startDate=${dateRange.start}&endDate=${dateRange.end}`,
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching store revenue:", error);
        return [];
      }
    },
    enabled: Boolean(dateRange.start && dateRange.end),
    staleTime: 30000,
  });

  // State for selected stores
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [showStoreSelection, setShowStoreSelection] = useState(false);
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");

  // Initialize selected stores when data loads - select all by default
  useEffect(() => {
    if (storeRevenueData && storeRevenueData.length > 0) {
      // Always sync with all stores if none are selected
      if (selectedStores.length === 0) {
        setSelectedStores(storeRevenueData.map((store) => store.storeCode));
      }
    }
  }, [storeRevenueData]);

  // Filter store revenue data based on selection
  const filteredStoreRevenueData = useMemo(() => {
    if (!storeRevenueData) return [];
    return storeRevenueData.filter((store) =>
      selectedStores.includes(store.storeCode),
    );
  }, [storeRevenueData, selectedStores]);

  // Toggle store selection
  const toggleStoreSelection = (storeCode: string) => {
    setSelectedStores((prev) => {
      if (prev.includes(storeCode)) {
        return prev.filter((code) => code !== storeCode);
      } else {
        return [...prev, storeCode];
      }
    });
  };

  // Select all stores
  const selectAllStores = () => {
    if (storeRevenueData) {
      setSelectedStores(storeRevenueData.map((store) => store.storeCode));
    }
  };

  // Deselect all stores
  const deselectAllStores = () => {
    setSelectedStores([]);
  };

  const dashboardStats: DashboardStats = useMemo(() => {
    const stats: DashboardStats = {
      totalSalesRevenue: 0,
      subtotalRevenue: 0,
      estimatedRevenue: 0,
      servingRevenue: 0,
      cancelledRevenue: 0,
      periodOrderCount: 0,
      periodCustomerCount: 0,
      dailyAverageRevenue: 0,
      activeOrders: 0,
      completedOrdersCount: 0,
      processingOrdersCount: 0,
      cancelledOrdersCount: 0,
      unpaidOrdersCount: 0, // Initialize unpaidOrdersCount
      totalOrdersInRange: 0,
      dateRange: `${dateRange.start} to ${dateRange.end}`,
      paymentMethods: {},
      topProducts: [],
    };

    console.log("Dashboard - Orders loaded:", ordersData?.length || 0);
    console.log("Dashboard - Order items loaded:", orderItemsData?.length || 0);

    if (!ordersData || !dateRangeOrders || !orderItemsData) {
      return stats;
    }

    // Filter orders by selected stores - if no stores selected, use all orders
    let filteredDateRangeOrders = dateRangeOrders;
    if (selectedStores.length > 0) {
      filteredDateRangeOrders = dateRangeOrders.filter((order: any) =>
        selectedStores.includes(order.storeCode)
      );
    }

    // Filter completed orders from date range
    const completedOrders = filteredDateRangeOrders.filter(
      (order) => order.status === "completed" || order.status === "paid",
    );

    // Filter unpaid orders from date range (only within selected date range)
    const unpaidOrders = filteredDateRangeOrders.filter(
      (order) =>
        order.status === "pending" ||
        order.status === "unpaid" ||
        order.status === "served" ||
        order.status === "preparing",
    );

    console.log(
      `Dashboard - Date Range: ${dateRange.start} to ${dateRange.end}`,
    );
    console.log(`Dashboard - Total orders in range: ${dateRangeOrders.length}`);
    console.log(`Dashboard - Completed orders: ${completedOrders.length}`);
    console.log(`Dashboard - Unpaid orders: ${unpaidOrders.length}`);
    console.log(
      `Dashboard - Sample completed orders:`,
      completedOrders.slice(0, 3).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        orderedAt: o.orderedAt,
        createdAt: o.createdAt,
      })),
    );

    // Filter serving orders from date range only
    const servingOrders = filteredDateRangeOrders.filter(
      (order) =>
        order.status === "served" ||
        order.status === "preparing" ||
        order.status === "pending",
    );

    // Filter cancelled orders from date range
    const cancelledOrders = filteredDateRangeOrders.filter(
      (order) => order.status === "cancelled",
    );

    // Count active orders from date range only
    const activeOrdersCount = filteredDateRangeOrders.filter(
      (order) =>
        order.status === "pending" ||
        order.status === "preparing" ||
        order.status === "served",
    ).length;

    // Calculate revenues with proper priceIncludeTax handling
    const completedOrdersRevenue = completedOrders.reduce((sum, order) => {
      const orderTotal = parseFloat(order.total || "0");
      const orderTax = parseFloat(order.tax || "0");
      const priceIncludeTax = order.priceIncludeTax === true;

      // If price includes tax, revenue = total - tax
      // If price doesn't include tax, revenue = total (already net of tax)
      const revenue = priceIncludeTax ? orderTotal - orderTax : orderTotal;
      return sum + revenue;
    }, 0);

    const servingOrdersRevenue = servingOrders.reduce((sum, order) => {
      const orderTotal = parseFloat(order.total || "0");
      const orderTax = parseFloat(order.tax || "0");
      const priceIncludeTax = order.priceIncludeTax === true;

      // If price includes tax, revenue = total - tax
      // If price doesn't include tax, revenue = total (already net of tax)
      const revenue = priceIncludeTax ? orderTotal - orderTax : orderTotal;
      return sum + revenue;
    }, 0);

    const cancelledOrdersRevenue = cancelledOrders.reduce((sum, order) => {
      const orderTotal = parseFloat(order.total || "0");
      const orderTax = parseFloat(order.tax || "0");
      const priceIncludeTax = order.priceIncludeTax === true;

      // If price includes tax, revenue = total - tax
      // If price doesn't include tax, revenue = total (already net of tax)
      const revenue = priceIncludeTax ? orderTotal - orderTax : orderTotal;
      return sum + revenue;
    }, 0);

    const estimatedRevenue = completedOrdersRevenue + servingOrdersRevenue;

    let getPaymentMethodName = (method: string): string => {
      const names = {
        cash: t("common.cash"),
        creditCard: t("common.creditCard"),
        debitCard: t("common.debitCard"),
        card: t("common.transfer"),
        momo: t("common.momo"),
        zalopay: t("common.zalopay"),
        vnpay: t("common.vnpay"),
        qrCode: t("common.qrCode"),
        shopeepay: t("common.shopeepay"),
        grabpay: t("common.grabpay"),
      };
      return names[method as keyof typeof names] || t("common.cash");
    };

    // Calculate payment methods statistics - total customer payment
    const paymentMethods: { [key: string]: { count: number; total: number } } =
      {};
    completedOrders.forEach((order) => {
      const method = order.paymentMethod || "cash";
      const methodName = getPaymentMethodName(method);
      if (!paymentMethods[methodName]) {
        paymentMethods[methodName] = { count: 0, total: 0 };
      }

      const orderTotal = parseFloat(order.total || "0");
      const orderTax = parseFloat(order.tax || "0");
      const priceIncludeTax = order.priceIncludeTax === true;

      // Calculate revenue first (same as above)
      let revenue;
      if (priceIncludeTax) {
        // If price includes tax: revenue = total - tax
        revenue = orderTotal - orderTax;
      } else {
        // If price doesn't include tax: revenue = total (already net of tax)
        revenue = orderTotal;
      }

      // Customer payment = revenue + tax
      const customerPayment = revenue + orderTax;

      paymentMethods[methodName].count += 1;
      paymentMethods[methodName].total += customerPayment;
    });

    // Get unique customers from date range orders
    const totalCustomers = filteredDateRangeOrders.reduce((total, order) => {
      return total + (order.customerCount || 1);
    }, 0);

    // Calculate top products
    const productStats: {
      [key: string]: {
        quantity: number;
        revenue: number;
        unitPrice: string;
        total: number;
      }; // Added unitPrice
    } = {};

    // Get order items for completed orders in date range
    const completedOrderIds = completedOrders.map((order) => order.id);
    const relevantOrderItems = orderItemsData.filter((item) =>
      completedOrderIds.includes(item.orderId),
    );

    relevantOrderItems.forEach((item) => {
      const productName = item.productName;
      const unitPrice = parseFloat(item.unitPrice || "0");
      const quantity = item.quantity;

      if (!productStats[productName]) {
        productStats[productName] = {
          quantity: 0,
          revenue: 0,
          unitPrice: item.unitPrice,
        };
      }

      // Find the order to get order-level discount
      const order = completedOrders.find((o) => o.id === item.orderId);
      const orderDiscount = parseFloat(order?.discount || "0");

      // Calculate item discount by distributing order discount proportionally
      let itemDiscountAmount = 0;
      if (orderDiscount > 0 && order) {
        // Calculate total before discount for this order
        const orderItems = relevantOrderItems.filter(
          (i) => i.orderId === order.id,
        );
        const totalBeforeDiscount = orderItems.reduce((sum, itm) => {
          return sum + parseFloat(itm.unitPrice || "0") * itm.quantity;
        }, 0);

        // Find if this is the last item in the order
        const currentIndex = orderItems.findIndex((i) => i.id === item.id);
        const isLastItem = currentIndex === orderItems.length - 1;

        if (isLastItem) {
          // Last item: total discount - sum of all previous discounts
          let previousDiscounts = 0;
          for (let i = 0; i < orderItems.length - 1; i++) {
            const prevItem = orderItems[i];
            const prevItemTotal =
              parseFloat(prevItem.unitPrice || "0") * prevItem.quantity;
            const prevItemDiscount =
              totalBeforeDiscount > 0
                ? Math.round(
                    (orderDiscount * prevItemTotal) / totalBeforeDiscount,
                  )
                : 0;
            previousDiscounts += prevItemDiscount;
          }
          itemDiscountAmount = orderDiscount - previousDiscounts;
        } else {
          // Regular calculation for non-last items
          const itemTotal = unitPrice * quantity;
          itemDiscountAmount =
            totalBeforeDiscount > 0
              ? Math.round((orderDiscount * itemTotal) / totalBeforeDiscount)
              : 0;
        }
      }

      // Calculate revenue: price * quantity - distributed discount
      const itemRevenue = unitPrice * quantity - itemDiscountAmount;

      productStats[productName].quantity += quantity;
      productStats[productName].revenue += itemRevenue;
      productStats[productName].unitPrice = item.unitPrice;
    });

    const topProducts = Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate daily average
    const daysDiff = Math.max(
      1,
      Math.ceil(
        (new Date(dateRange.end).getTime() -
          new Date(dateRange.start).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1,
    );

    stats.totalSalesRevenue = completedOrdersRevenue;
    stats.subtotalRevenue = completedOrdersRevenue;
    stats.estimatedRevenue = estimatedRevenue;
    stats.servingRevenue = servingOrdersRevenue;
    stats.cancelledRevenue = cancelledOrdersRevenue;
    stats.periodOrderCount = completedOrders.length;
    stats.periodCustomerCount = totalCustomers;
    stats.dailyAverageRevenue = completedOrdersRevenue / daysDiff;
    stats.activeOrders = activeOrdersCount;
    stats.completedOrdersCount = completedOrders.length;
    stats.processingOrdersCount = servingOrders.length;
    stats.cancelledOrdersCount = cancelledOrders.length;
    stats.unpaidOrdersCount = unpaidOrders.length; // Set unpaid orders count
    stats.totalOrdersInRange = filteredDateRangeOrders.length;
    stats.paymentMethods = paymentMethods;
    stats.topProducts = topProducts;

    console.log("Dashboard Debug - Final Stats:", stats);

    return stats;
  }, [ordersData, dateRangeOrders, orderItemsData, dateRange, selectedStores]);

  const formatCurrency = (amount: number | string) => {
    // Ensure amount is treated as a number, default to 0 if parsing fails
    const numericAmount =
      typeof amount === "string" ? parseFloat(amount) : amount;
    const finalAmount = isNaN(numericAmount) ? 0 : numericAmount;

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(finalAmount);
  };

  const getOccupiedTablesCount = () => {
    if (!tablesData) return 0;
    return tablesData.filter((table: any) => table.status === "occupied")
      .length;
  };

  const getTotalTablesCount = () => {
    if (!tablesData) return 10;
    return tablesData.length;
  };

  const handleOrderDetailsClick = () => {
    // Navigate to sales orders page with date range parameters
    setLocation(
      `/sales-orders?startDate=${dateRange.start}&endDate=${dateRange.end}`,
    );
  };

  if (ordersLoading || orderItemsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-500">{t("common.loading")}...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Date Filter Section */}
      <div className="bg-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-gray-700 hover:bg-gray-300 px-2 py-1"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              {(() => {
                const today = new Date();
                const todayStr = format(today, "yyyy-MM-dd");

                // Check if it's today
                const isToday =
                  dateRange.start === todayStr && dateRange.end === todayStr;
                if (isToday) {
                  return t("reports.today");
                }

                // Check if it's yesterday
                const yesterday = subDays(today, 1);
                const yesterdayStr = format(yesterday, "yyyy-MM-dd");
                const isYesterday =
                  dateRange.start === yesterdayStr &&
                  dateRange.end === yesterdayStr;
                if (isYesterday) {
                  return t("reports.yesterday");
                }

                // Check if it's day before yesterday
                const dayBeforeYesterday = subDays(today, 2);
                const dayBeforeYesterdayStr = format(
                  dayBeforeYesterday,
                  "yyyy-MM-dd",
                );
                const isDayBeforeYesterday =
                  dateRange.start === dayBeforeYesterdayStr &&
                  dateRange.end === dayBeforeYesterdayStr;
                if (isDayBeforeYesterday) {
                  return t("reports.dayBeforeYesterday");
                }

                // Check if it's last week (last Monday to last Sunday)
                const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
                const daysToLastMonday =
                  currentDayOfWeek === 0 ? 6 : currentDayOfWeek + 6;
                const lastMonday = subDays(today, daysToLastMonday);
                const lastSunday = subDays(
                  today,
                  currentDayOfWeek === 0 ? 0 : currentDayOfWeek,
                );
                const lastWeekStart = format(lastMonday, "yyyy-MM-dd");
                const lastWeekEnd = format(lastSunday, "yyyy-MM-dd");
                const isLastWeek =
                  dateRange.start === lastWeekStart &&
                  dateRange.end === lastWeekEnd;
                if (isLastWeek) {
                  return t("reports.lastWeek");
                }

                // Check if it's this month
                const monthStart = new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  1,
                );
                const monthEnd = new Date(
                  today.getFullYear(),
                  today.getMonth() + 1,
                  0,
                );
                const thisMonthStart = format(monthStart, "yyyy-MM-dd");
                const thisMonthEnd = format(monthEnd, "yyyy-MM-dd");
                const isThisMonth =
                  dateRange.start === thisMonthStart &&
                  dateRange.end === thisMonthEnd;
                if (isThisMonth) {
                  return t("reports.thisMonth");
                }

                // Check if it's last month
                const lastMonth = new Date(
                  today.getFullYear(),
                  today.getMonth() - 1,
                  1,
                );
                const lastMonthEnd = new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  0,
                );
                const lastMonthStart = format(lastMonth, "yyyy-MM-dd");
                const lastMonthEndStr = format(lastMonthEnd, "yyyy-MM-dd");
                const isLastMonth =
                  dateRange.start === lastMonthStart &&
                  dateRange.end === lastMonthEndStr;
                if (isLastMonth) {
                  return t("reports.lastMonth");
                }

                // Check if it's this year (from January 1st to today)
                const yearStart = new Date(today.getFullYear(), 0, 1);
                const yearStartStr = format(yearStart, "yyyy-MM-dd");
                const isThisYear =
                  dateRange.start === yearStartStr &&
                  dateRange.end === todayStr;
                if (isThisYear) {
                  return t("reports.thisYear");
                }

                return `${format(new Date(dateRange.start), "dd/MM/yyyy", { locale: vi })} - ${format(new Date(dateRange.end), "dd/MM/yyyy", { locale: vi })}`;
              })()}
              <ChevronRight
                className={`w-4 h-4 ml-1 transition-transform ${showDatePicker ? "rotate-90" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Date Range Picker */}
        {showDatePicker && (
          <div className="mt-3 p-3 bg-white rounded-lg shadow-sm border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  {t("reports.startDate")}
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange((prev) => ({
                      ...prev,
                      start: e.target.value,
                    }));
                    setActiveFilter("custom");
                  }}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  {t("reports.endDate")}
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange((prev) => ({ ...prev, end: e.target.value }));
                    setActiveFilter("custom");
                  }}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const formattedToday = format(today, "yyyy-MM-dd");
                  setDateRange({ start: formattedToday, end: formattedToday });
                  setActiveFilter("today");
                  setShowDatePicker(false);
                }}
                className="text-xs px-3 py-1 border border-green-600 text-green-600 bg-white hover:bg-green-50"
              >
                {t("reports.toDay")}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const yesterday = subDays(today, 1);
                  const formattedYesterday = format(yesterday, "yyyy-MM-dd");
                  setDateRange({
                    start: formattedYesterday,
                    end: formattedYesterday,
                  });
                  setActiveFilter("yesterday");
                  setShowDatePicker(false);
                }}
                className="text-xs px-3 py-1 border border-green-600 text-green-600 bg-white hover:bg-green-50"
              >
                {t("reports.yesterday")}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const dayBeforeYesterday = subDays(today, 2);
                  const formattedDay = format(dayBeforeYesterday, "yyyy-MM-dd");
                  setDateRange({ start: formattedDay, end: formattedDay });
                  setActiveFilter("dayBeforeYesterday");
                  setShowDatePicker(false);
                }}
                className="text-xs px-3 py-1 border border-green-600 text-green-600 bg-white hover:bg-green-50"
              >
                {t("reports.dayBeforeYesterday")}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

                  // Calculate days to last Monday
                  const daysToLastMonday =
                    currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
                  const lastMonday = subDays(today, daysToLastMonday + 7);

                  // Last Sunday is 6 days after last Monday
                  const lastSunday = subDays(today, daysToLastMonday + 1);

                  setDateRange({
                    start: format(lastMonday, "yyyy-MM-dd"),
                    end: format(lastSunday, "yyyy-MM-dd"),
                  });
                  setActiveFilter("lastWeek");
                  setShowDatePicker(false);
                }}
                className="text-xs px-3 py-1 border border-green-600 text-green-600 bg-white hover:bg-green-50"
              >
                {t("reports.lastWeek")}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const start = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1,
                  );
                  const end = new Date(
                    today.getFullYear(),
                    today.getMonth() + 1,
                    0,
                  );
                  setDateRange({
                    start: format(start, "yyyy-MM-dd"),
                    end: format(end, "yyyy-MM-dd"),
                  });
                  setActiveFilter("thisMonth");
                  setShowDatePicker(false);
                }}
                className="text-xs px-3 py-1 border border-green-600 text-green-600 bg-white hover:bg-green-50"
              >
                {t("reports.thisMonth")}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date(
                    today.getFullYear(),
                    today.getMonth() - 1,
                    1,
                  );
                  const lastMonthEnd = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    0,
                  );
                  setDateRange({
                    start: format(lastMonth, "yyyy-MM-dd"),
                    end: format(lastMonthEnd, "yyyy-MM-dd"),
                  });
                  setActiveFilter("lastMonth");
                  setShowDatePicker(false);
                }}
                className="text-xs px-3 py-1 border border-green-600 text-green-600 bg-white hover:bg-green-50"
              >
                {t("reports.lastMonth")}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const yearStart = new Date(today.getFullYear(), 0, 1);
                  setDateRange({
                    start: format(yearStart, "yyyy-MM-dd"),
                    end: format(today, "yyyy-MM-dd"),
                  });
                  setActiveFilter("thisYear");
                  setShowDatePicker(false);
                }}
                className="text-xs px-3 py-1 border border-green-600 text-green-600 bg-white hover:bg-green-50"
              >
                {t("reports.thisYear")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Store Selector */}
      <div className="px-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-gray-600" />
                <span className="font-semibold">{t("reports.selectStores")}</span>
              </div>
              <Badge variant="outline">
                {selectedStores.length > 0 ? selectedStores.length : t("common.all")}
              </Badge>
            </div>
            <Button
              onClick={() => setShowStoreSelection(true)}
              variant="outline"
              size="sm"
              className="w-full border-2 border-green-600 hover:bg-green-50"
            >
              <Store className="w-4 h-4 mr-2" />
              {selectedStores.length > 0 
                ? `${selectedStores.length} ${t("reports.storesSelected")}`
                : t("common.all")}
            </Button>
          </CardContent>
        </Card>

        {/* Store Selection Dialog */}
        <Dialog
          open={showStoreSelection}
          onOpenChange={setShowStoreSelection}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("reports.selectStores")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">
                  {selectedStores.length} / {storeRevenueData?.length || 0}{" "}
                  {t("reports.storesSelected")}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllStores}
                    className="text-xs px-3 py-1"
                  >
                    {t("reports.selectAll")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={deselectAllStores}
                    className="text-xs px-3 py-1"
                  >
                    {t("reports.deselectAll")}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {storeRevenueData?.map((store: any, index: number) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all ${
                      selectedStores.includes(store.storeCode)
                        ? "bg-green-50 border-2 border-green-200"
                        : "bg-gray-50 border-2 border-transparent opacity-60"
                    }`}
                    onClick={() =>
                      toggleStoreSelection(store.storeCode)
                    }
                  >
                    <input
                      type="checkbox"
                      checked={selectedStores.includes(store.storeCode)}
                      onChange={() =>
                        toggleStoreSelection(store.storeCode)
                      }
                      className="w-4 h-4 text-green-600 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {store.storeName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {store.storeCode}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      {formatCurrency(store.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-3 border-t">
              <Button
                onClick={() => setShowStoreSelection(false)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {t("reports.confirm")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 gap-3 px-4">
        {/* Main Revenue Card */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm">
                    {t("reports.revenueLabel")}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(dashboardStats.totalSalesRevenue)}
                  </p>
                </div>
                <div className="text-green-600 text-sm flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {(() => {
                    // Giả sử doanh thu hôm qua (có thể fetch từ API sau)
                    const yesterdayRevenue =
                      dashboardStats.totalSalesRevenue * 0.85; // Mock data
                    const todayRevenue = dashboardStats.totalSalesRevenue;

                    if (yesterdayRevenue === 0) return "+0%";

                    const percentChange =
                      ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) *
                      100;
                    const isPositive = percentChange >= 0;

                    return `${isPositive ? "+" : ""}${percentChange.toFixed(1)}% ${isPositive ? "↑" : "↓"}`;
                  })()}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {t("reports.comparedToYesterday")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sub Revenue Cards */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">
                  {t("reports.estimatedRevenue")}
                </span>
                <span className="font-semibold">
                  {formatCurrency(dashboardStats.estimatedRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">
                  {t("reports.paid")}
                </span>
                <span className="font-semibold">
                  {formatCurrency(dashboardStats.totalSalesRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">
                  {storeSettings?.businessType === "laundry"
                    ? t("reports.unpaid")
                    : t("reports.processing")}
                </span>
                <span className="font-semibold">
                  {storeSettings?.businessType === "laundry"
                    ? formatCurrency(dashboardStats.servingRevenue)
                    : dashboardStats.processingOrdersCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">
                  {t("reports.cancelled")}
                </span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(dashboardStats.cancelledRevenue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables and Orders Stats */}
      {storeSettings?.businessType !== "laundry" && (
        <div className="px-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                <div className="text-sm text-gray-600">
                  {t("reports.tablesInUse")}
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {getOccupiedTablesCount()}/{getTotalTablesCount()}
                </div>
                <div className="w-12 h-8 bg-gray-200 rounded mx-auto flex items-center justify-center">
                  <div className="w-8 h-6 bg-gray-400 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Store Revenue Chart */}
      <div className="px-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Store className="w-5 h-5" />
              {t("reports.salesAnalysisReport")}
            </h3>

            {storeRevenueData && storeRevenueData.length > 0 ? (
              <div className="space-y-4">

                {/* Chart Type Selector */}
                <div className="flex gap-2 mb-4">
                  <Button
                    size="icon"
                    variant={chartType === "pie" ? "default" : "outline"}
                    onClick={() => setChartType("pie")}
                    className="h-9 w-9"
                    title="Biểu đồ tròn"
                  >
                    <PieChartIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={chartType === "bar" ? "default" : "outline"}
                    onClick={() => setChartType("bar")}
                    className="h-9 w-9"
                    title="Biểu đồ cột"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Charts - Only show if there are selected stores */}
                {filteredStoreRevenueData.length > 0 ? (
                  <>
                    {chartType === "pie" ? (
                      <div className="space-y-4">
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={filteredStoreRevenueData}
                                dataKey="revenue"
                                nameKey="storeName"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                label={({ percent }) =>
                                  `${(percent * 100).toFixed(1)}%`
                                }
                              >
                                {filteredStoreRevenueData.map(
                                  (entry, index) => {
                                    const colors = [
                                      "#3b82f6",
                                      "#ec4899",
                                      "#10b981",
                                      "#f59e0b",
                                      "#ef4444",
                                      "#8b5cf6",
                                      "#06b6d4",
                                      "#84cc16",
                                    ];
                                    return (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={colors[index % colors.length]}
                                      />
                                    );
                                  },
                                )}
                              </Pie>
                              <Tooltip
                                formatter={(value) =>
                                  formatCurrency(Number(value))
                                }
                                contentStyle={{
                                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  padding: "8px 12px",
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Custom Legend */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {filteredStoreRevenueData.map((store, index) => {
                            const colors = [
                              "#3b82f6",
                              "#ec4899",
                              "#10b981",
                              "#f59e0b",
                              "#ef4444",
                              "#8b5cf6",
                              "#06b6d4",
                              "#84cc16",
                            ];
                            const totalRevenue =
                              filteredStoreRevenueData.reduce(
                                (sum, s) => sum + s.revenue,
                                0,
                              );
                            const percentage =
                              totalRevenue > 0
                                ? (
                                    (store.revenue / totalRevenue) *
                                    100
                                  ).toFixed(1)
                                : "0";

                            return (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor:
                                      colors[index % colors.length],
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-gray-700 truncate">
                                    {store.storeName}
                                  </div>
                                  <div className="text-gray-500">
                                    {percentage}% •{" "}
                                    {formatCurrency(store.revenue)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={filteredStoreRevenueData}
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 60,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="storeName"
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis
                              tickFormatter={(value) =>
                                `${(value / 1000000).toFixed(1)}M`
                              }
                            />
                            <Tooltip
                              formatter={(value) =>
                                formatCurrency(Number(value))
                              }
                              labelFormatter={(label) => label}
                              contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.98)",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                padding: "8px 12px",
                              }}
                            />
                            <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                              {filteredStoreRevenueData.map((entry, index) => {
                                const colors = [
                                  "#3b82f6",
                                  "#ec4899",
                                  "#10b981",
                                  "#f59e0b",
                                  "#ef4444",
                                  "#8b5cf6",
                                  "#06b6d4",
                                  "#84cc16",
                                ];
                                return (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={colors[index % colors.length]}
                                  />
                                );
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-8">
                    {t("reports.noStoresSelected")}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                {t("reports.noStoreData")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders Section */}
      <div className="px-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">{t("reports.orders")}</div>
              <div className="text-2xl font-bold text-green-600">
                {dashboardStats.totalOrdersInRange}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>{t("reports.completed")}</span>
                  <span className="font-semibold">
                    {dashboardStats.completedOrdersCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">
                    {storeSettings?.businessType === "laundry"
                      ? t("reports.unpaid")
                      : t("reports.processing")}
                  </span>
                  <span className="font-semibold">
                    {dashboardStats.processingOrdersCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("reports.cancelled")}</span>
                  <span className="font-semibold">
                    {dashboardStats.cancelledOrdersCount}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Detail Button Section */}
      <div className="px-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold">{t("reports.orders")}</span>
              <button
                onClick={handleOrderDetailsClick}
                className="flex items-center gap-1 text-purple-600 text-sm hover:text-purple-700 transition-colors cursor-pointer"
              >
                <span>{t("reports.viewDetails")}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Products */}
      <div className="px-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 text-center">
              {t("reports.topSellingProducts")}
            </h3>
            <div className="space-y-3">
              {dashboardStats.topProducts.length > 0 ? (
                dashboardStats.topProducts.map((product, index) => {
                  const colors = [
                    "bg-blue-500",
                    "bg-green-500",
                    "bg-orange-500",
                    "bg-purple-500",
                    "bg-red-500",
                  ];
                  const totalRevenue = dashboardStats.topProducts.reduce(
                    (sum, p) => sum + p.revenue,
                    0,
                  );
                  const percentage =
                    totalRevenue > 0
                      ? ((product.revenue / totalRevenue) * 100).toFixed(0)
                      : "0";

                  return (
                    <div className="flex items-center gap-3" key={index}>
                      <div
                        className={`w-3 h-3 rounded-full ${colors[index] || "bg-gray-500"}`}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(product.revenue)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500 text-center">
                  {t("reports.noDataAvailable")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <div className="px-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">
              {t("reports.paymentMethods")}
            </h3>

            <div className="space-y-3">
              {Object.entries(dashboardStats.paymentMethods).length > 0 ? (
                Object.entries(dashboardStats.paymentMethods).map(
                  ([method, data], index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{method}</div>
                        <div className="text-sm text-gray-500">
                          {t("reports.orderCount")}:{" "}
                          <span className="font-semibold">
                            {data.count} {t("reports.orders")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {t("common.totalCustomerPayment")}:{" "}
                          {formatCurrency(data.total)}
                        </div>
                      </div>
                    </div>
                  ),
                )
              ) : (
                <div className="text-sm text-gray-500 text-center">
                  {t("reports.noPaymentData")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
