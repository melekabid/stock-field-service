import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/widgets/sacoges_logo.dart';
import '../data/stock_repository.dart';
import '../models/stock_product_model.dart';

final stockCatalogProvider = FutureProvider<List<StockProductModel>>((ref) async {
  return ref.watch(stockRepositoryProvider).fetchMobileCatalog();
});

class StocksPage extends ConsumerStatefulWidget {
  const StocksPage({super.key});

  @override
  ConsumerState<StocksPage> createState() => _StocksPageState();
}

class _StocksPageState extends ConsumerState<StocksPage> {
  final _searchController = TextEditingController();
  String _selectedFilter = 'Tous';

  void _goBack() {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(stockCatalogProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF061C4A),
              Color(0xFF0F4CC9),
              Color(0xFFEAF2FF),
            ],
            stops: [0, 0.44, 1],
          ),
        ),
        child: SafeArea(
          child: catalog.when(
            loading: () => const Center(child: CircularProgressIndicator(color: Colors.white)),
            error: (error, _) => _StockScaffold(
              title: 'Gestion de stocks',
              onBack: _goBack,
              child: _ErrorCard(message: '$error'),
            ),
            data: (items) {
              final categories = {
                'Tous',
                ...items.map((item) => item.category),
                ...items.map((item) => item.kind == 'MACHINE' ? 'Machines' : 'Consommables'),
              }.toList();

              final query = _searchController.text.trim().toLowerCase();
              final filtered = items.where((item) {
                final matchesText = query.isEmpty ||
                    item.name.toLowerCase().contains(query) ||
                    item.reference.toLowerCase().contains(query) ||
                    item.barcode.toLowerCase().contains(query);
                final matchesFilter = _selectedFilter == 'Tous' ||
                    item.category == _selectedFilter ||
                    (_selectedFilter == 'Machines' && item.kind == 'MACHINE') ||
                    (_selectedFilter == 'Consommables' && item.kind == 'CONSUMABLE');
                return matchesText && matchesFilter;
              }).toList();

              final totalQuantity = items.fold<int>(0, (sum, item) => sum + item.quantity);
              final machineCount = items.where((item) => item.kind == 'MACHINE').length;
              final lowStockCount = items.where((item) => item.isLowStock).length;

              return _StockScaffold(
                title: 'Gestion de stocks',
                onBack: _goBack,
                actions: [
                  FilledButton.icon(
                    onPressed: () => context.go('/stocks/scan'),
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF0F4CC9),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                    ),
                    icon: const Icon(Icons.qr_code_scanner_rounded),
                    label: const Text('Scanner'),
                  ),
                ],
                child: RefreshIndicator(
                  onRefresh: () async => ref.refresh(stockCatalogProvider.future),
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
                    children: [
                      _HeroStockPanel(
                        totalProducts: items.length,
                        totalQuantity: totalQuantity,
                        machineCount: machineCount,
                        lowStockCount: lowStockCount,
                      ),
                      const SizedBox(height: 18),
                      TextField(
                        controller: _searchController,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          labelText: 'Recherche par nom, reference ou code-barres',
                          prefixIcon: Icon(Icons.search_rounded),
                        ),
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        height: 44,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemBuilder: (_, index) {
                            final filter = categories[index];
                            final active = filter == _selectedFilter;
                            return ChoiceChip(
                              selected: active,
                              label: Text(filter),
                              onSelected: (_) => setState(() => _selectedFilter = filter),
                              selectedColor: const Color(0xFF0F4CC9),
                              labelStyle: TextStyle(
                                color: active ? Colors.white : const Color(0xFF14305D),
                                fontWeight: FontWeight.w700,
                              ),
                            );
                          },
                          separatorBuilder: (_, __) => const SizedBox(width: 10),
                          itemCount: categories.length,
                        ),
                      ),
                      const SizedBox(height: 18),
                      ...filtered.map((item) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: _StockProductCard(item: item),
                          )),
                      if (filtered.isEmpty)
                        const _EmptyStockCard(
                          text: 'Aucun produit ne correspond a votre recherche ou filtre.',
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _StockScaffold extends StatelessWidget {
  const _StockScaffold({
    required this.title,
    required this.child,
    required this.onBack,
    this.actions = const [],
  });

  final String title;
  final Widget child;
  final VoidCallback onBack;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
          child: Row(
            children: [
              IconButton.filledTonal(
                onPressed: onBack,
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white.withValues(alpha: 0.16),
                  foregroundColor: Colors.white,
                ),
                icon: const Icon(Icons.arrow_back_rounded),
              ),
              const SizedBox(width: 12),
              const SacogesLogo(
                size: 42,
                backgroundColor: Colors.transparent,
                padding: 3,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              ...actions,
            ],
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}

class _HeroStockPanel extends StatelessWidget {
  const _HeroStockPanel({
    required this.totalProducts,
    required this.totalQuantity,
    required this.machineCount,
    required this.lowStockCount,
  });

  final int totalProducts;
  final int totalQuantity;
  final int machineCount;
  final int lowStockCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        color: Colors.white.withValues(alpha: 0.14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Catalogue terrain',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 24),
          ),
          const SizedBox(height: 8),
          const Text(
            'Visualisez les quantites, les categories machines et consommables, puis scannez un code-barres pour sortir une piece du stock.',
            style: TextStyle(color: Color(0xFFDCE8FF), height: 1.5),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _StatPill(label: 'Produits', value: '$totalProducts'),
              _StatPill(label: 'Quantite totale', value: '$totalQuantity'),
              _StatPill(label: 'Machines', value: '$machineCount'),
              _StatPill(label: 'Stock bas', value: '$lowStockCount'),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: Colors.white.withValues(alpha: 0.16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(color: Color(0xFFDCE8FF), fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _StockProductCard extends StatelessWidget {
  const _StockProductCard({required this.item});

  final StockProductModel item;

  @override
  Widget build(BuildContext context) {
    final accent = item.kind == 'MACHINE' ? const Color(0xFF0F4CC9) : const Color(0xFF0C7EA3);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x140A2E6F),
            blurRadius: 22,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  color: accent.withValues(alpha: 0.12),
                ),
                child: Icon(
                  item.kind == 'MACHINE' ? Icons.precision_manufacturing_rounded : Icons.medical_services_rounded,
                  color: accent,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF102348),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.category,
                      style: TextStyle(color: accent, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: item.isLowStock ? const Color(0xFFFFF1F2) : const Color(0xFFEAF6EE),
                ),
                child: Text(
                  'Qté ${item.quantity}',
                  style: TextStyle(
                    color: item.isLowStock ? const Color(0xFFB42318) : const Color(0xFF137333),
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _InfoChip(label: 'Reference', value: item.reference),
              _InfoChip(label: 'Code-barres', value: item.barcode),
              _InfoChip(label: 'Type', value: item.kind == 'MACHINE' ? 'Machine' : 'Consommable'),
              _InfoChip(label: 'Depot', value: item.warehouseCode ?? 'MAIN'),
            ],
          ),
          if ((item.description ?? '').isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              item.description!,
              style: const TextStyle(color: Color(0xFF5A6E91), height: 1.45),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: const Color(0xFFF3F7FF),
      ),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(fontSize: 13),
          children: [
            TextSpan(
              text: '$label\n',
              style: const TextStyle(color: Color(0xFF6B7FA5), fontWeight: FontWeight.w700),
            ),
            TextSpan(
              text: value,
              style: const TextStyle(color: Color(0xFF102348), fontWeight: FontWeight.w900),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
          ),
          child: Text(
            message,
            style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFB42318)),
          ),
        ),
      ),
    );
  }
}

class _EmptyStockCard extends StatelessWidget {
  const _EmptyStockCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Text(
        text,
        style: const TextStyle(color: Color(0xFF5A6E91), fontWeight: FontWeight.w700),
      ),
    );
  }
}
