import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../../order/schema/order.schema';
import { Product, ProductDocument } from '../../products/schemas/product.schema';
import {
  AgentCommission,
  AgentCommissionDocument,
} from '../../agents/schemas/agent.commission.schema';

export type DashboardRange = 'this_week' | 'last_week' | 'this_month' | 'last_month';

interface DateRange {
  start: Date;
  end: Date;
}

interface PeriodRanges {
  current: DateRange;
  previous: DateRange;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(AgentCommission.name)
    private agentCommissionModel: Model<AgentCommissionDocument>,
  ) {}

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private getMonday(date: Date): Date {
    const d = this.startOfDay(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  private getMonthStart(date: Date): Date {
    return this.startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  private getMonthEnd(date: Date): Date {
    return this.endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  }

  private getPeriodRanges(range: DashboardRange, reference = new Date()): PeriodRanges {
    if (range === 'this_week') {
      const currentStart = this.getMonday(reference);
      const currentEnd = this.endOfDay(
        new Date(currentStart.getTime() + 6 * 24 * 60 * 60 * 1000),
      );
      const previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 7);
      const previousEnd = this.endOfDay(
        new Date(previousStart.getTime() + 6 * 24 * 60 * 60 * 1000),
      );
      return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
      };
    }

    if (range === 'last_week') {
      const thisWeekMonday = this.getMonday(reference);
      const currentStart = new Date(thisWeekMonday);
      currentStart.setDate(currentStart.getDate() - 7);
      const currentEnd = this.endOfDay(
        new Date(currentStart.getTime() + 6 * 24 * 60 * 60 * 1000),
      );
      const previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 7);
      const previousEnd = this.endOfDay(
        new Date(previousStart.getTime() + 6 * 24 * 60 * 60 * 1000),
      );
      return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
      };
    }

    if (range === 'this_month') {
      const currentStart = this.getMonthStart(reference);
      const currentEnd = this.getMonthEnd(reference);
      const previousStart = this.getMonthStart(
        new Date(reference.getFullYear(), reference.getMonth() - 1, 1),
      );
      const previousEnd = this.getMonthEnd(
        new Date(reference.getFullYear(), reference.getMonth() - 1, 1),
      );
      return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
      };
    }

    const lastMonth = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
    const currentStart = this.getMonthStart(lastMonth);
    const currentEnd = this.getMonthEnd(lastMonth);
    const previousStart = this.getMonthStart(
      new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1),
    );
    const previousEnd = this.getMonthEnd(
      new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1),
    );
    return {
      current: { start: currentStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd },
    };
  }

  private validOrderMatch() {
    return {
      status: {
        $nin: [OrderStatus.ORDER_CANCELLED, OrderStatus.ORDER_FAILED],
      },
    };
  }

  private orderDateMatch(start: Date, end: Date) {
    return {
      createdAt: { $gte: start, $lte: end },
      ...this.validOrderMatch(),
    };
  }

  private commissionDateMatch(start: Date, end: Date) {
    return {
      createdAt: { $gte: start, $lte: end },
    };
  }

  private async sumCommissionsInRange(start: Date, end: Date): Promise<number> {
    const agg = await this.agentCommissionModel.aggregate([
      { $match: this.commissionDateMatch(start, end) },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]);
    return agg[0]?.total ?? 0;
  }

  private async sumPaidCommissions(): Promise<number> {
    const agg = await this.agentCommissionModel.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]);
    return agg[0]?.total ?? 0;
  }

  async getCommissionSummary() {
    const thisWeek = this.getPeriodRanges('this_week').current;
    const lastWeek = this.getPeriodRanges('last_week').current;
    const thisMonth = this.getPeriodRanges('this_month').current;
    const lastMonth = this.getPeriodRanges('last_month').current;

    const [
      thisWeekTotal,
      lastWeekTotal,
      thisMonthTotal,
      lastMonthTotal,
    ] = await Promise.all([
      this.sumCommissionsInRange(thisWeek.start, thisWeek.end),
      this.sumCommissionsInRange(lastWeek.start, lastWeek.end),
      this.sumCommissionsInRange(thisMonth.start, thisMonth.end),
      this.sumCommissionsInRange(lastMonth.start, lastMonth.end),
    ]);

    return {
      thisWeek: thisWeekTotal,
      lastWeek: lastWeekTotal,
      thisMonth: thisMonthTotal,
      lastMonth: lastMonthTotal,
    };
  }

  async getSummaryCards() {
    const [
      salesAgg,
      orderCount,
      activePartners,
      commissionAgg,
    ] = await Promise.all([
      this.orderModel.aggregate([
        { $match: this.validOrderMatch() },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $ifNull: ['$breakdown.grandTotal', { $ifNull: ['$totalPrice', 0] }],
              },
            },
          },
        },
      ]),
      this.orderModel.countDocuments(this.validOrderMatch()),
      this.orderModel.distinct('agentId', {
        ...this.validOrderMatch(),
        agentId: { $exists: true, $nin: [null, ''] },
      }),
      this.agentCommissionModel.aggregate([
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
      ]),
    ]);

    const totalSales = salesAgg[0]?.total ?? 0;
    const totalCommissions = commissionAgg[0]?.total ?? 0;

    return {
      totalSales,
      totalOrders: orderCount,
      activePartners: activePartners.length,
      totalCommissions,
    };
  }

  async getTopProducts(limit = 5) {
    const effectiveLimit = Math.max(5, limit);

    const topSkus = await this.orderModel.aggregate([
      { $match: this.validOrderMatch() },
      { $unwind: '$productSku' },
      {
        $group: {
          _id: '$productSku',
          quantitySold: { $sum: 1 },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: effectiveLimit },
    ]);

    if (!topSkus.length) {
      return { products: [] };
    }

    const skuList = topSkus.map((item) => item._id);
    const products = await this.productModel
      .find({ sku: { $in: skuList } })
      .select('sku name image gallery')
      .lean();

    const productMap = new Map(products.map((p) => [p.sku, p]));

    const productsWithDetails = topSkus.map((item) => {
      const product = productMap.get(item._id);
      return {
        sku: item._id,
        name: product?.name ?? item._id,
        image: product?.image ?? product?.gallery?.[0] ?? null,
        quantitySold: item.quantitySold,
      };
    });

    return { products: productsWithDetails };
  }

  async getSalesOverview(range: DashboardRange = 'this_week') {
    const { current, previous } = this.getPeriodRanges(range);

    const [thisWeekAgg, lastWeekAgg] = await Promise.all([
      this.orderModel.aggregate([
        { $match: this.orderDateMatch(current.start, current.end) },
        {
          $group: {
            _id: { $dayOfWeek: '$createdAt' },
            total: {
              $sum: {
                $ifNull: ['$breakdown.grandTotal', { $ifNull: ['$totalPrice', 0] }],
              },
            },
          },
        },
      ]),
      this.orderModel.aggregate([
        { $match: this.orderDateMatch(previous.start, previous.end) },
        {
          $group: {
            _id: { $dayOfWeek: '$createdAt' },
            total: {
              $sum: {
                $ifNull: ['$breakdown.grandTotal', { $ifNull: ['$totalPrice', 0] }],
              },
            },
          },
        },
      ]),
    ]);

    const toDayIndex = (mongoDayOfWeek: number) =>
      mongoDayOfWeek === 1 ? 6 : mongoDayOfWeek - 2;

    const thisWeekMap = new Map(
      thisWeekAgg.map((row) => [toDayIndex(row._id), row.total]),
    );
    const lastWeekMap = new Map(
      lastWeekAgg.map((row) => [toDayIndex(row._id), row.total]),
    );

    const thisWeek = DAY_LABELS.map((_, index) => thisWeekMap.get(index) ?? 0);
    const lastWeek = DAY_LABELS.map((_, index) => lastWeekMap.get(index) ?? 0);

    return {
      range,
      labels: DAY_LABELS,
      thisWeek,
      lastWeek,
    };
  }
}
