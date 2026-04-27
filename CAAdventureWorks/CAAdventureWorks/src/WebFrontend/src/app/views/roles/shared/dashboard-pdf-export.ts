export interface DashboardPdfMetric {
    label?: string;
    title?: string;
    value?: unknown;
    note?: string;
    suffix?: string;
    format?: string;
    type?: string;
}

export interface DashboardPdfSection {
    title: string;
    subtitle?: string;
    headers: string[];
    rows: Array<Array<unknown>>;
    widths?: unknown[];
}

export interface DashboardPdfOptions {
    title: string;
    subtitle?: string;
    filePrefix?: string;
    metrics?: DashboardPdfMetric[];
    secondaryMetrics?: DashboardPdfMetric[];
    filters?: string[];
    sections?: DashboardPdfSection[];
}

export async function exportDashboardPdf(options: DashboardPdfOptions): Promise<void> {
    const generatedAt = new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date());

    const [pdfMakeModule, pdfFontsModule] = await Promise.all([
        import('pdfmake/build/pdfmake' as string),
        import('pdfmake/build/vfs_fonts' as string)
    ]);
    const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule;
    const pdfFonts = (pdfFontsModule as any).default ?? pdfFontsModule;
    const vfs = pdfFonts.vfs ?? pdfFonts.pdfMake?.vfs ?? pdfFonts;

    if (typeof pdfMake.addVirtualFileSystem === 'function') {
        pdfMake.addVirtualFileSystem(vfs);
    } else {
        pdfMake.vfs = vfs;
    }

    pdfMake
        .createPdf(buildDashboardPdfDefinition(options, generatedAt))
        .download(`${options.filePrefix ?? normalizeFilePrefix(options.title)}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf`);
}

function buildDashboardPdfDefinition(options: DashboardPdfOptions, generatedAt: string): any {
    const primaryMetrics = normalizeMetrics(options.metrics ?? []);
    const secondaryMetrics = normalizeMetrics(options.secondaryMetrics ?? []);
    const sections = options.sections ?? [];

    return {
        pageSize: 'A4',
        pageMargins: [30, 34, 30, 42],
        info: {
            title: `Báo cáo ${options.title}`,
            author: 'Enterprise Operations Hub',
            subject: `${options.title} Dashboard`
        },
        footer: (currentPage: number, pageCount: number) => ({
            columns: [
                { text: 'Dashboard-X | Enterprise Operations Hub | Confidential', alignment: 'left' },
                { text: `Trang ${currentPage} / ${pageCount}`, alignment: 'right' }
            ],
            margin: [30, 0],
            fontSize: 8,
            color: '#64748b'
        }),
        content: [
            buildCover(options.title, options.subtitle, generatedAt),
            buildExecutiveSummary(primaryMetrics, secondaryMetrics),
            ...(options.filters?.length ? [buildFilterSummary(options.filters)] : []),
            ...sections.flatMap((section, index) => [
                ...(index === 3 ? [{ text: '', pageBreak: 'before' }] : []),
                buildPdfSection(section)
            ]),
            {
                text: 'Ghi chú: Báo cáo được tạo tự động từ dashboard theo dữ liệu và bộ lọc đang áp dụng tại thời điểm xuất.',
                style: 'note',
                margin: [0, 12, 0, 0]
            }
        ],
        styles: {
            reportTitle: { fontSize: 22, bold: true, color: '#ffffff', characterSpacing: 0.5 },
            reportSubtitle: { fontSize: 9, color: '#bfdbfe', margin: [0, 4, 0, 0] },
            orgText: { fontSize: 9, color: '#e0f2fe', bold: true },
            coverLabel: { fontSize: 7, color: '#bfdbfe', bold: true, characterSpacing: 0.5 },
            coverValue: { fontSize: 10, color: '#ffffff', bold: true, margin: [0, 3, 0, 0] },
            sectionTitle: { fontSize: 12, bold: true, color: '#0f172a' },
            sectionSubtitle: { fontSize: 8, color: '#64748b', margin: [0, 2, 0, 6] },
            tableHeader: { bold: true, color: '#1e3a8a', fillColor: '#dbeafe', fontSize: 8 },
            tableCell: { fontSize: 8, color: '#111827' },
            kpiLabel: { fontSize: 7, color: '#64748b', bold: true, characterSpacing: 0.3 },
            kpiValue: { fontSize: 13, color: '#0f172a', bold: true },
            kpiNote: { fontSize: 7, color: '#475569' },
            note: { fontSize: 8, italics: true, color: '#64748b' }
        },
        defaultStyle: {
            fontSize: 9,
            color: '#111827'
        }
    };
}

function buildCover(title: string, subtitle: string | undefined, generatedAt: string): any {
    return {
        table: {
            widths: ['*', 150],
            body: [[
                {
                    stack: [
                        { text: `BÁO CÁO ${title.toUpperCase()}`, style: 'reportTitle' },
                        { text: subtitle ?? 'Dashboard performance report', style: 'reportSubtitle' },
                        { text: 'Enterprise Operations Hub', style: 'orgText', margin: [0, 8, 0, 0] }
                    ],
                    border: [false, false, false, false],
                    fillColor: '#0f172a',
                    margin: [14, 14, 14, 14]
                },
                {
                    stack: [
                        { text: 'NGÀY XUẤT', style: 'coverLabel' },
                        { text: generatedAt, style: 'coverValue' },
                        { text: 'PHẠM VI', style: 'coverLabel', margin: [0, 10, 0, 0] },
                        { text: 'Dashboard hiện tại', style: 'coverValue' }
                    ],
                    border: [false, false, false, false],
                    fillColor: '#2563eb',
                    margin: [12, 14, 12, 14]
                }
            ]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 14]
    };
}

function buildExecutiveSummary(primaryMetrics: DashboardPdfMetric[], secondaryMetrics: DashboardPdfMetric[]): any {
    const metrics = [...primaryMetrics.slice(0, 4), ...secondaryMetrics.slice(0, 4)];

    if (!metrics.length) {
        return {
            text: 'Không có dữ liệu KPI để hiển thị trong báo cáo.',
            color: '#64748b',
            margin: [0, 0, 0, 12]
        };
    }

    const rows = chunk(metrics, 4).map((row) => ({
        columns: row.map((metric, index) => buildKpiPdfCard(metric, pickColor(index))),
        columnGap: 8,
        margin: [0, 0, 0, 8]
    }));

    return {
        stack: [
            { text: 'Tóm tắt KPI', style: 'sectionTitle', margin: [0, 0, 0, 6] },
            ...rows
        ],
        margin: [0, 0, 0, 8]
    };
}

function buildKpiPdfCard(metric: DashboardPdfMetric, color: string): any {
    return {
        table: {
            widths: [4, '*'],
            body: [[
                { text: '', fillColor: color, border: [false, false, false, false] },
                {
                    stack: [
                        { text: String(metric.label ?? metric.title ?? 'Chỉ số').toUpperCase(), style: 'kpiLabel' },
                        { text: formatMetricValue(metric), style: 'kpiValue', margin: [0, 3, 0, 2] },
                        { text: metric.note ?? metric.suffix ?? metric.type ?? '', style: 'kpiNote' }
                    ],
                    margin: [6, 6, 6, 6]
                }
            ]]
        },
        layout: cardLayout('#dbe4f0')
    };
}

function buildFilterSummary(filters: string[]): any {
    const pairs = filters.map(item => {
        const separatorIndex = item.indexOf(':');
        return separatorIndex >= 0
            ? [item.slice(0, separatorIndex), item.slice(separatorIndex + 1).trim()]
            : ['Bộ lọc', item];
    });

    return {
        table: {
            widths: ['*', '*', '*'],
            body: [
                [{ text: 'BỘ LỌC / NGỮ CẢNH', colSpan: 3, style: 'tableHeader', fillColor: '#eef2ff' }, {}, {}],
                ...Array.from({ length: Math.ceil(pairs.length / 3) }, (_, rowIndex) => {
                    const row = pairs.slice(rowIndex * 3, rowIndex * 3 + 3).map(([label, value]) => ({
                        stack: [
                            { text: label.toUpperCase(), fontSize: 6, bold: true, color: '#64748b' },
                            { text: value || 'Tất cả', fontSize: 8, color: '#0f172a', margin: [0, 2, 0, 0] }
                        ],
                        margin: [6, 4, 6, 4]
                    }) as any);

                    while (row.length < 3) row.push({ text: '' } as any);
                    return row;
                })
            ]
        },
        layout: cardLayout('#c7d2fe'),
        margin: [0, 0, 0, 12]
    };
}

function buildPdfSection(section: DashboardPdfSection): any[] {
    if (!section.rows.length) {
        return [
            { text: section.title, style: 'sectionTitle' },
            { text: section.subtitle ?? '', style: 'sectionSubtitle' },
            { text: 'Không có dữ liệu trong bộ lọc hiện tại.', color: '#64748b', fontSize: 9, margin: [0, 0, 0, 8] }
        ];
    }

    return [
        { text: section.title, style: 'sectionTitle' },
        { text: section.subtitle ?? '', style: 'sectionSubtitle' },
        {
            table: {
                headerRows: 1,
                widths: section.widths ?? section.headers.map(() => '*'),
                body: [
                    section.headers.map(header => ({ text: header, style: 'tableHeader', margin: [3, 4, 3, 4] })),
                    ...section.rows.map(row => row.map((cell, index) => ({
                        text: formatCell(cell),
                        style: 'tableCell',
                        alignment: index === 0 || index === 1 ? 'left' : 'right',
                        margin: [3, 4, 3, 4]
                    })))
                ]
            },
            layout: {
                hLineWidth: (i: number) => i === 0 || i === 1 ? 0.8 : 0.4,
                vLineWidth: () => 0.3,
                hLineColor: () => '#cbd5e1',
                vLineColor: () => '#e2e8f0',
                fillColor: (rowIndex: number) => rowIndex === 0 ? '#dbeafe' : rowIndex % 2 === 0 ? '#f8fafc' : null
            },
            margin: [0, 0, 0, 10]
        }
    ];
}

function normalizeMetrics(metrics: DashboardPdfMetric[]): DashboardPdfMetric[] {
    return metrics.filter(Boolean).map(metric => ({
        ...metric,
        label: metric.label ?? metric.title ?? 'Chỉ số'
    }));
}

function formatMetricValue(metric: DashboardPdfMetric): string {
    const value = metric.value;
    if (typeof value !== 'number') return formatCell(value);

    if (metric.format === 'currency') return formatCurrency(value);
    if (metric.format === 'percent' || metric.type === 'percent') return formatPercent(metric.type === 'percent' ? value : value / 100);
    if (metric.format === 'decimal') return formatNumber(value, 1);
    return `${formatNumber(value)}${metric.suffix && metric.suffix !== '%' ? ` ${metric.suffix}` : metric.suffix === '%' ? '%' : ''}`;
}

function formatCell(value: unknown): string {
    if (value == null) return 'N/A';
    if (typeof value === 'number') return formatNumber(value);
    if (typeof value === 'boolean') return value ? 'Có' : 'Không';
    return String(value);
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 1): string {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits }).format(value);
}

function formatPercent(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function cardLayout(lineColor: string): any {
    return {
        hLineColor: () => lineColor,
        vLineColor: () => lineColor,
        hLineWidth: () => 0.6,
        vLineWidth: () => 0.6,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
    };
}

function chunk<T>(items: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
}

function pickColor(index: number): string {
    return ['#2563eb', '#f97316', '#059669', '#8b5cf6', '#0ea5e9', '#ef4444', '#14b8a6', '#64748b'][index % 8];
}

function normalizeFilePrefix(title: string): string {
    return title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '') || 'Dashboard';
}
