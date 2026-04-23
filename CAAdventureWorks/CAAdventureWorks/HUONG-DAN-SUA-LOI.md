# 🔧 HƯỚNG DẪN SỬA LỖI SALES DASHBOARD

## 📋 Tóm tắt vấn đề
**Lỗi:** Không thể tải dữ liệu Sales Dashboard - HTTP 500 Internal Server Error

**Nguyên nhân:** Database view `Sales.vSalesPerson` không tồn tại trong database AdventureWorks

**Giải pháp:** Tạo view `Sales.vSalesPerson` bằng script SQL đã chuẩn bị

---

## ✅ CÁCH SỬA LỖI

### Bước 1: Mở SQL Server Management Studio (SSMS)
1. Kết nối đến SQL Server instance: `(localdb)\MSSQLLocalDB`
2. Chọn database: `AdventureWorks`

### Bước 2: Chạy script SQL
1. Mở file: `fix-salesdashboard-view.sql`
2. Copy toàn bộ nội dung
3. Paste vào SSMS Query Window
4. Nhấn F5 hoặc Execute để chạy script

### Bước 3: Kiểm tra view đã được tạo
```sql
-- Kiểm tra view tồn tại
SELECT * FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA = 'Sales' AND TABLE_NAME = 'vSalesPerson'

-- Xem dữ liệu mẫu
SELECT TOP 5 * FROM Sales.vSalesPerson
```

### Bước 4: Khởi động lại backend API
1. Dừng backend API (Ctrl+C trong terminal)
2. Chạy lại: `dotnet run` hoặc khởi động từ Visual Studio

### Bước 5: Test lại Sales Dashboard
1. Refresh trang web
2. Truy cập Sales Dashboard
3. Kiểm tra dữ liệu đã load thành công

---

## 🔍 LOGS ĐÃ THÊM

Sau khi sửa, bạn sẽ thấy logs chi tiết trong console:
- ✅ `🔍 [Sales Dashboard] Bắt đầu tải dữ liệu với filters...`
- ✅ `📊 [Sales Dashboard] Bước 1/13: Đang build Overview...`
- ✅ `👤 [Sales Dashboard] Bước 3/13: Đang build Sales By Person...` ← Trước đây lỗi ở đây
- ✅ `✅ [Sales Dashboard] Hoàn thành tải dữ liệu thành công!`

---

## 📝 FILES ĐÃ THAY ĐỔI

1. **GetSalesDashboardQuery.cs** - Đã thêm logging chi tiết
2. **fix-salesdashboard-view.sql** - Script tạo view vSalesPerson

---

## ❓ NẾU VẪN CÒN LỖI

Nếu sau khi chạy script vẫn còn lỗi, kiểm tra:

1. **Connection string đúng chưa?**
   - File: `src/Web/appsettings.json`
   - Kiểm tra: `Server=(localdb)\\MSSQLLocalDB;Database=AdventureWorks`

2. **Database AdventureWorks có tồn tại không?**
   ```sql
   SELECT name FROM sys.databases WHERE name = 'AdventureWorks'
   ```

3. **Các bảng cần thiết có đủ không?**
   ```sql
   SELECT TABLE_SCHEMA, TABLE_NAME 
   FROM INFORMATION_SCHEMA.TABLES 
   WHERE TABLE_SCHEMA IN ('Sales', 'Person', 'HumanResources')
   ORDER BY TABLE_SCHEMA, TABLE_NAME
   ```

4. **Xem logs backend chi tiết**
   - Logs sẽ hiển thị chính xác lỗi ở bước nào (1-13)
   - Nếu lỗi ở bước khác ngoài bước 3, có thể là vấn đề khác

---

## 📞 HỖ TRỢ

Nếu cần hỗ trợ thêm, vui lòng cung cấp:
- Message lỗi từ backend logs
- Kết quả của các query kiểm tra ở trên
- Screenshot lỗi nếu có
