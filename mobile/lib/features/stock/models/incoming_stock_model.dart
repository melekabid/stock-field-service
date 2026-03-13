class IncomingStockModel {
  IncomingStockModel({
    required this.id,
    required this.quantity,
    required this.expectedAt,
    required this.status,
    required this.productId,
    required this.productName,
    required this.productCode,
    required this.productBarcode,
    required this.categoryName,
    required this.warehouseId,
    required this.warehouseName,
    this.notes,
    this.receivedAt,
  });

  final String id;
  final int quantity;
  final DateTime expectedAt;
  final String status;
  final String productId;
  final String productName;
  final String productCode;
  final String productBarcode;
  final String categoryName;
  final String warehouseId;
  final String warehouseName;
  final String? notes;
  final DateTime? receivedAt;

  bool get isReceived => status == 'RECEIVED';

  factory IncomingStockModel.fromJson(Map<String, dynamic> json) {
    final product = Map<String, dynamic>.from(json['product'] as Map? ?? const {});
    final category = Map<String, dynamic>.from(product['category'] as Map? ?? const {});
    final warehouse = Map<String, dynamic>.from(json['warehouse'] as Map? ?? const {});

    return IncomingStockModel(
      id: json['id'] as String? ?? '',
      quantity: json['quantity'] as int? ?? 0,
      expectedAt: DateTime.tryParse(json['expectedAt'] as String? ?? '') ?? DateTime.now(),
      status: json['status'] as String? ?? 'ORDERED',
      productId: product['id'] as String? ?? '',
      productName: product['name'] as String? ?? 'Produit',
      productCode: product['code'] as String? ?? '-',
      productBarcode: product['barcode'] as String? ?? '',
      categoryName: category['name'] as String? ?? '-',
      warehouseId: warehouse['id'] as String? ?? '',
      warehouseName: warehouse['name'] as String? ?? '-',
      notes: json['notes'] as String?,
      receivedAt: json['receivedAt'] == null ? null : DateTime.tryParse(json['receivedAt'] as String),
    );
  }
}

class ProductOptionModel {
  ProductOptionModel({
    required this.id,
    required this.code,
    required this.name,
    required this.barcode,
    required this.categoryName,
  });

  final String id;
  final String code;
  final String name;
  final String barcode;
  final String categoryName;

  factory ProductOptionModel.fromJson(Map<String, dynamic> json) {
    final category = Map<String, dynamic>.from(json['category'] as Map? ?? const {});
    return ProductOptionModel(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? 'Produit',
      barcode: json['barcode'] as String? ?? '',
      categoryName: category['name'] as String? ?? '-',
    );
  }
}

class WarehouseOptionModel {
  WarehouseOptionModel({
    required this.id,
    required this.code,
    required this.name,
  });

  final String id;
  final String code;
  final String name;

  factory WarehouseOptionModel.fromJson(Map<String, dynamic> json) {
    return WarehouseOptionModel(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? 'Depot',
    );
  }
}
