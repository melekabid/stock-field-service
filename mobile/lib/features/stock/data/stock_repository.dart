import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../models/incoming_stock_model.dart';
import '../models/stock_product_model.dart';

final stockRepositoryProvider = Provider<StockRepository>((ref) {
  return StockRepository(ref.watch(apiClientProvider));
});

class StockRepository {
  StockRepository(this._client);

  final dynamic _client;

  Future<List<StockProductModel>> fetchMobileCatalog() async {
    final response = await _client.get('/stock/mobile');
    final data = (response.data as List<dynamic>)
        .map((item) => StockProductModel.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
    return data;
  }

  Future<StockScanResult> scanBarcode(String barcode) async {
    final response = await _client.post(
      '/stock/scan-barcode',
      data: {
        'barcode': barcode,
        'quantity': 1,
      },
    );

    return StockScanResult.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  Future<List<IncomingStockModel>> fetchIncomingStock() async {
    final response = await _client.get('/stock/incoming');
    return (response.data as List<dynamic>)
        .map((item) => IncomingStockModel.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<List<ProductOptionModel>> fetchProducts() async {
    final response = await _client.get('/products');
    return (response.data as List<dynamic>)
        .map((item) => ProductOptionModel.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<List<WarehouseOptionModel>> fetchWarehouses() async {
    final response = await _client.get('/warehouses');
    return (response.data as List<dynamic>)
        .map((item) => WarehouseOptionModel.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<void> createIncoming({
    required String productId,
    required String warehouseId,
    required int quantity,
    required DateTime expectedAt,
    String? notes,
  }) async {
    await _client.post(
      '/stock/incoming',
      data: {
        'productId': productId,
        'warehouseId': warehouseId,
        'quantity': quantity,
        'expectedAt': expectedAt.toIso8601String(),
        'notes': notes?.trim().isEmpty == true ? null : notes?.trim(),
      },
    );
  }

  Future<void> updateIncoming({
    required String id,
    required String productId,
    required String warehouseId,
    required int quantity,
    required DateTime expectedAt,
    String? notes,
  }) async {
    await _client.patch(
      '/stock/incoming/$id',
      data: {
        'productId': productId,
        'warehouseId': warehouseId,
        'quantity': quantity,
        'expectedAt': expectedAt.toIso8601String(),
        'notes': notes?.trim().isEmpty == true ? null : notes?.trim(),
      },
    );
  }

  Future<void> receiveIncoming(String id) async {
    await _client.post('/stock/incoming/$id/receive');
  }

  Future<void> deleteIncoming(String id) async {
    await _client.delete('/stock/incoming/$id');
  }
}
