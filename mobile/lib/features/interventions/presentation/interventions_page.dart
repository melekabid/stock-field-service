import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../shared/widgets/sacoges_logo.dart';
import '../data/interventions_repository.dart';

final interventionsProvider = FutureProvider((ref) async {
  return ref.watch(interventionsRepositoryProvider).fetchAssigned();
});

class InterventionsPage extends ConsumerStatefulWidget {
  const InterventionsPage({super.key});

  @override
  ConsumerState<InterventionsPage> createState() => _InterventionsPageState();
}

class _InterventionsPageState extends ConsumerState<InterventionsPage> {
  String? _exportingId;

  void _goBack() {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go('/home');
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'COMPLETED':
        return const Color(0xFF0E7490);
      case 'IN_PROGRESS':
        return const Color(0xFF2563EB);
      case 'CANCELLED':
        return const Color(0xFFDC2626);
      default:
        return const Color(0xFF1D4ED8);
    }
  }

  String _formatDate(DateTime date) {
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    return '$day/$month/${date.year}';
  }

  Future<void> _exportPdf(String interventionId) async {
    setState(() => _exportingId = interventionId);
    try {
      final pdfUrl = await ref.read(interventionsRepositoryProvider).generatePdf(interventionId);
      final uri = Uri.parse(pdfUrl);
      final launched = await launchUrl(
        uri,
        mode: kIsWeb ? LaunchMode.platformDefault : LaunchMode.externalApplication,
        webOnlyWindowName: kIsWeb ? '_blank' : null,
      );
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Impossible d’ouvrir le PDF.')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Export PDF impossible pour cette intervention.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _exportingId = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final interventions = ref.watch(interventionsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFEAF2FF),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF0B3C8A),
              Color(0xFF1C63D5),
              Color(0xFFEAF2FF),
            ],
            stops: [0, 0.28, 0.28],
          ),
        ),
        child: SafeArea(
          child: interventions.when(
            data: (items) => RefreshIndicator(
              color: const Color(0xFF1D4ED8),
              onRefresh: () async => ref.refresh(interventionsProvider.future),
              child: ListView(
                physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
                children: [
                  Row(
                    children: [
                      IconButton.filledTonal(
                        onPressed: _goBack,
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.16),
                          foregroundColor: Colors.white,
                        ),
                        icon: const Icon(Icons.arrow_back_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _HeroPanel(
                    total: items.length,
                    openCount: items.where((item) => item.status == 'OPEN').length,
                    inProgressCount: items.where((item) => item.status == 'IN_PROGRESS').length,
                    completedCount: items.where((item) => item.status == 'COMPLETED').length,
                    onCreate: () => context.go('/interventions/new'),
                  ),
                  const SizedBox(height: 22),
                  if (items.isEmpty)
                    const _EmptyState()
                  else
                    ...items.map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: _InterventionCard(
                          number: item.number,
                          status: item.status,
                          dateLabel: _formatDate(item.date),
                          description: item.description,
                          clientName: item.clientName,
                          siteName: item.siteName,
                          statusColor: _statusColor(item.status),
                          exporting: _exportingId == item.id,
                          onOpen: () => context.go('/interventions/${item.id}'),
                          onExport: () => _exportPdf(item.id),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            error: (_, __) {
              final cached = ref.read(interventionsRepositoryProvider).loadCached();
              return ListView(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
                children: [
                  Row(
                    children: [
                      IconButton.filledTonal(
                        onPressed: _goBack,
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.16),
                          foregroundColor: Colors.white,
                        ),
                        icon: const Icon(Icons.arrow_back_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const _HeroPanel(
                    total: 0,
                    openCount: 0,
                    inProgressCount: 0,
                    completedCount: 0,
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(28),
                    ),
                    child: const Text(
                      'Mode hors ligne : affichage des interventions en cache.',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  const SizedBox(height: 14),
                  ...cached.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _InterventionCard(
                        number: item.number,
                        status: item.status,
                        dateLabel: _formatDate(item.date),
                        description: item.description,
                        clientName: item.clientName,
                        siteName: item.siteName,
                        statusColor: _statusColor(item.status),
                        exporting: false,
                        onOpen: () => context.go('/interventions/${item.id}'),
                        onExport: null,
                      ),
                    ),
                  ),
                ],
              );
            },
            loading: () => const Center(
              child: CircularProgressIndicator(color: Colors.white),
            ),
          ),
        ),
      ),
    );
  }
}

class _HeroPanel extends StatelessWidget {
  const _HeroPanel({
    required this.total,
    required this.openCount,
    required this.inProgressCount,
    required this.completedCount,
    this.onCreate,
  });

  final int total;
  final int openCount;
  final int inProgressCount;
  final int completedCount;
  final VoidCallback? onCreate;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(34),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0A2E6F),
            Color(0xFF1D5FD1),
            Color(0xFF7AB6FF),
          ],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x330B3C8A),
            blurRadius: 28,
            offset: Offset(0, 18),
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
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const SacogesLogo(
                  size: 54,
                  backgroundColor: Colors.transparent,
                  padding: 4,
                ),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Interventions terrain',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 25,
                        fontWeight: FontWeight.w800,
                        height: 1.1,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Suivi, modification et export PDF dans une interface plus premium.',
                      style: TextStyle(color: Color(0xFFDCEBFF), height: 1.35),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _MetricChip(label: 'Total', value: total.toString()),
              _MetricChip(label: 'Ouvertes', value: openCount.toString()),
              _MetricChip(label: 'En cours', value: inProgressCount.toString()),
              _MetricChip(label: 'Cloturees', value: completedCount.toString()),
            ],
          ),
          const SizedBox(height: 22),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: onCreate,
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF0B3C8A),
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              ),
              icon: const Icon(Icons.add_circle_outline_rounded),
              label: const Text(
                'Nouvelle fiche',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 132,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFFDCEBFF), fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _InterventionCard extends StatelessWidget {
  const _InterventionCard({
    required this.number,
    required this.status,
    required this.dateLabel,
    required this.description,
    required this.clientName,
    required this.siteName,
    required this.statusColor,
    required this.exporting,
    required this.onOpen,
    required this.onExport,
  });

  final String number;
  final String status;
  final String dateLabel;
  final String description;
  final String clientName;
  final String siteName;
  final Color statusColor;
  final bool exporting;
  final VoidCallback onOpen;
  final VoidCallback? onExport;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        boxShadow: const [
          BoxShadow(
            color: Color(0x140B3C8A),
            blurRadius: 24,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(30),
          onTap: onOpen,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      status.replaceAll('_', ' '),
                      style: TextStyle(color: statusColor, fontWeight: FontWeight.w800),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F1FF),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        dateLabel,
                        style: const TextStyle(
                          color: Color(0xFF0F3E8A),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  number,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0D234D),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  description,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(height: 1.45, color: Color(0xFF4A5E84)),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: _BadgeLine(
                        icon: Icons.person_outline_rounded,
                        label: clientName,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _BadgeLine(
                        icon: Icons.precision_manufacturing_outlined,
                        label: siteName,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: onOpen,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF0F3E8A),
                        side: const BorderSide(color: Color(0xFFBED4FF)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                      icon: const Icon(Icons.visibility_outlined),
                      label: const Text('Ouvrir'),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: exporting ? null : onExport,
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF0F4CC9),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                        ),
                        icon: exporting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.picture_as_pdf_rounded),
                        label: Text(exporting ? 'Export...' : 'Exporter PDF'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BadgeLine extends StatelessWidget {
  const _BadgeLine({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F9FF),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFF2353B3)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFF163C88),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
      ),
      child: const Column(
        children: [
          Icon(Icons.cloud_done_rounded, size: 54, color: Color(0xFF1D4ED8)),
          SizedBox(height: 14),
          Text(
            'Aucune intervention pour le moment',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0D234D),
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Créez une nouvelle fiche ou synchronisez vos interventions pour remplir cette vue.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF5A6E91), height: 1.45),
          ),
        ],
      ),
    );
  }
}
