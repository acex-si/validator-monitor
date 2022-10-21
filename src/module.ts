import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetricsController } from './controllers/metrics';
import { AggregationsController } from './controllers/uptime';
import { LoggerModule } from './modules/logger';
import { AggregationsManager } from './services/aggregations-manager';
import { Configuration } from './services/config';
import { DashboardManager } from './services/grafana-tools';
import { PrometheusRegistry } from './services/prometheus';
import { UptimeManager } from './services/uptime-manager';

@Module({
  imports: [ConfigModule.forRoot(), LoggerModule],
  controllers: [MetricsController, AggregationsController],
  providers: [Configuration, PrometheusRegistry, UptimeManager, DashboardManager, AggregationsManager],
})
export class AppModule {
}
