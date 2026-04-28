export interface DeptChartConfig {
  id: string;
  name: string;
  subtitle: string;
  prompts: string[];
}

export const DEPT_CHART_CONFIGS: Record<string, DeptChartConfig> = {
  sales: {
    id: 'sales',
    name: 'Kinh Doanh',
    subtitle: 'Dashboard biểu đồ AI - Phòng Kinh Doanh',
    prompts: [
      'Vẽ biểu đồ doanh thu theo tháng',
      'Vẽ biểu đồ doanh thu theo vùng bán hàng',
      'Vẽ biểu đồ xu hướng tăng trưởng năm 2014',
      'Vẽ biểu đồ top 5 sản phẩm bán chạy',
      'Vẽ biểu đồ phân bố đơn hàng theo trạng thái',
      'Vẽ biểu đồ so sánh doanh thu giữa các quý',
    ],
  },
  purchasing: {
    id: 'purchasing',
    name: 'Mua Hàng',
    subtitle: 'Dashboard biểu đồ AI - Phòng Mua Hàng',
    prompts: [
      'Vẽ biểu đồ chi phí mua hàng theo tháng',
      'Vẽ biểu đồ top 5 nhà cung cấp',
      'Vẽ biểu đồ số lượng đơn hàng mua theo trạng thái',
      'Vẽ biểu đồ so sánh chi phí giữa các vật liệu',
      'Vẽ biểu đồ thời gian giao hàng trung bình',
    ],
  },
  production: {
    id: 'production',
    name: 'Sản Xuất',
    subtitle: 'Dashboard biểu đồ AI - Phòng Sản Xuất',
    prompts: [
      'Vẽ biểu đồ số lượng sản phẩm sản xuất theo tháng',
      'Vẽ biểu đồ tỷ lệ hoàn thành work order',
      'Vẽ biểu đồ top 5 sản phẩm có chi phí sản xuất cao nhất',
      'Vẽ biểu đồ phân bố scrap theo location',
      'Vẽ biểu đồ thời gian sản xuất trung bình',
    ],
  },
  productioncontrol: {
    id: 'productioncontrol',
    name: 'Kiểm Soát Sản Xuất',
    subtitle: 'Dashboard biểu đồ AI - Phòng Kiểm Soát Sản Xuất',
    prompts: [
      'Vẽ biểu đồ số lượng work order theo trạng thái',
      'Vẽ biểu đồ tỷ lệ hoàn thành theo location',
      'Vẽ biểu đồ so sánh scrap giữa các sản phẩm',
      'Vẽ biểu đồ thời gian thực hiện routing trung bình',
      'Vẽ biểu đồ tồn kho theo location',
    ],
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing',
    subtitle: 'Dashboard biểu đồ AI - Phòng Marketing',
    prompts: [
      'Vẽ biểu đồ doanh thu theo vùng',
      'Vẽ biểu đồ top 5 sản phẩm bán chạy',
      'Vẽ biểu đồ doanh thu theo tháng',
      'Vẽ biểu đồ phân bố khách hàng theo vùng',
      'Vẽ biểu đồ xu hướng mua hàng theo mùa',
    ],
  },
  humanresources: {
    id: 'humanresources',
    name: 'Nhân Sự',
    subtitle: 'Dashboard biểu đồ AI - Phòng Nhân Sự',
    prompts: [
      'Vẽ biểu đồ số lượng nhân viên theo phòng ban',
      'Vẽ biểu đồ phân bố nhân viên theo shift',
      'Vẽ biểu đồ số lượng ứng viên theo trạng thái',
      'Vẽ biểu đồ top 5 phòng ban có nhiều nhân viên nhất',
      'Vẽ biểu đồ xu hướng tuyển dụng theo thời gian',
    ],
  },
  finance: {
    id: 'finance',
    name: 'Tài Chính',
    subtitle: 'Dashboard biểu đồ AI - Phòng Tài Chính',
    prompts: [
      'Vẽ biểu đồ doanh thu và chi phí mua hàng theo tháng',
      'Vẽ biểu đồ top 5 khách hàng có doanh thu cao nhất',
      'Vẽ biểu đồ so sánh doanh thu và chi phí',
      'Vẽ biểu đồ phân bố đơn hàng theo ship method',
      'Vẽ biểu đồ top 5 vendor có giá trị mua hàng cao nhất',
    ],
  },
  qualityassurance: {
    id: 'qualityassurance',
    name: 'Kiểm Tra Chất Lượng',
    subtitle: 'Dashboard biểu đồ AI - Phòng QA',
    prompts: [
      'Vẽ biểu đồ tỷ lệ scrap theo sản phẩm',
      'Vẽ biểu đồ số lượng work order hoàn thành vs chưa hoàn thành',
      'Vẽ biểu đồ top 5 nguyên nhân scrap phổ biến nhất',
      'Vẽ biểu đồ thời gian kiểm tra trung bình theo location',
      'Vẽ biểu đồ tồn kho theo trạng thái chất lượng',
    ],
  },
  documentcontrol: {
    id: 'documentcontrol',
    name: 'Kiểm Soát Tài Liệu',
    subtitle: 'Dashboard biểu đồ AI - Phòng Kiểm Soát Tài Liệu',
    prompts: [
      'Vẽ biểu đồ phân bố tài liệu theo danh mục',
      'Vẽ biểu đồ số lượng tài liệu liên quan đến sản phẩm',
      'Vẽ biểu đồ top 5 sản phẩm có nhiều tài liệu nhất',
      'Vẽ biểu đồ work order theo trạng thái',
      'Vẽ biểu đồ tài liệu theo thời gian tạo',
    ],
  },
  engineering: {
    id: 'engineering',
    name: 'Kỹ Thuật',
    subtitle: 'Dashboard biểu đồ AI - Phòng Kỹ Thuật',
    prompts: [
      'Vẽ biểu đồ phân cấp sản phẩm theo danh mục',
      'Vẽ biểu đồ số lượng BOM theo sản phẩm',
      'Vẽ biểu đồ top 5 sản phẩm có nhiều thành phần nhất',
      'Vẽ biểu đồ work order theo trạng thái',
      'Vẽ biểu đồ công suất location theo giờ',
    ],
  },
  tooldesign: {
    id: 'tooldesign',
    name: 'Thiết Kế Dụng Cụ',
    subtitle: 'Dashboard biểu đồ AI - Phòng Thiết Kế Dụng Cụ',
    prompts: [
      'Vẽ biểu đồ số lượng BOM theo danh mục sản phẩm',
      'Vẽ biểu đồ top 5 sản phẩm có cấu trúc phức tạp nhất',
      'Vẽ biểu đồ work order theo trạng thái',
      'Vẽ biểu đồ phân bố công suất theo location',
      'Vẽ biểu đồ số lượng nguyên vật liệu sử dụng',
    ],
  },
  shippingreceiving: {
    id: 'shippingreceiving',
    name: 'Vận Chuyển & Nhận Hàng',
    subtitle: 'Dashboard biểu đồ AI - Phòng Vận Chuyển & Nhận Hàng',
    prompts: [
      'Vẽ biểu đồ số lượng đơn hàng bán theo ship method',
      'Vẽ biểu đồ số lượng đơn mua hàng theo trạng thái',
      'Vẽ biểu đồ top 5 vendor có thời gian giao nhanh nhất',
      'Vẽ biểu đồ so sánh chi phí vận chuyển giữa các phương thức',
      'Vẽ biểu đồ phân bố tồn kho theo location',
    ],
  },
  informationservices: {
    id: 'informationservices',
    name: 'Dịch Vụ Thông Tin',
    subtitle: 'Dashboard biểu đồ AI - Phòng Dịch Vụ Thông Tin',
    prompts: [
      'Vẽ biểu đồ phân bố địa chỉ theo tỉnh/thành',
      'Vẽ biểu đồ số lượng sản phẩm theo danh mục',
      'Vẽ biểu đồ top 5 vùng có nhiều khách hàng nhất',
      'Vẽ biểu đồ phân bố sản phẩm theo subcategory',
      'Vẽ biểu đồ thông tin địa lý theo quốc gia',
    ],
  },
  facilities: {
    id: 'facilities',
    name: 'Cơ Sở Vật Chất',
    subtitle: 'Dashboard biểu đồ AI - Phòng Cơ Sở Vật Chất',
    prompts: [
      'Vẽ biểu đồ phân bố địa chỉ theo tỉnh/thành',
      'Vẽ biểu đồ số lượng nhân viên theo vùng địa lý',
      'Vẽ biểu đồ phân bố khách hàng theo quốc gia',
      'Vẽ biểu đồ tỷ lệ nhân viên theo vùng',
      'Vẽ biểu đồ phân bố địa chỉ theo city',
    ],
  },
};

export function getDeptConfig(deptId: string): DeptChartConfig {
  return DEPT_CHART_CONFIGS[deptId] ?? DEPT_CHART_CONFIGS['sales'];
}
