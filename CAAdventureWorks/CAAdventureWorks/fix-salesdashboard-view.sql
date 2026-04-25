-- =============================================
-- Script: Tạo View vSalesPerson để sửa lỗi Sales Dashboard
-- Mô tả: View này kết hợp thông tin từ SalesPerson, Person, Employee, Address và SalesTerritory
-- =============================================

USE AdventureWorks;
GO

-- Kiểm tra và xóa view cũ nếu tồn tại
IF OBJECT_ID('Sales.vSalesPerson', 'V') IS NOT NULL
    DROP VIEW Sales.vSalesPerson;
GO

-- Tạo view mới
CREATE VIEW Sales.vSalesPerson
AS
SELECT 
    sp.BusinessEntityID,
    p.Title,
    p.FirstName,
    p.MiddleName,
    p.LastName,
    p.Suffix,
    e.JobTitle,
    pp.PhoneNumber,
    pnt.Name AS PhoneNumberType,
    ea.EmailAddress,
    p.EmailPromotion,
    a.AddressLine1,
    a.AddressLine2,
    a.City,
    sp2.Name AS StateProvinceName,
    a.PostalCode,
    cr.Name AS CountryRegionName,
    st.Name AS TerritoryName,
    st.[Group] AS TerritoryGroup,
    sp.SalesQuota,
    sp.SalesYTD,
    sp.SalesLastYear
FROM Sales.SalesPerson sp
    INNER JOIN HumanResources.Employee e 
        ON e.BusinessEntityID = sp.BusinessEntityID
    INNER JOIN Person.Person p 
        ON p.BusinessEntityID = sp.BusinessEntityID
    LEFT OUTER JOIN Person.EmailAddress ea 
        ON ea.BusinessEntityID = p.BusinessEntityID
    LEFT OUTER JOIN Person.PersonPhone pp 
        ON pp.BusinessEntityID = p.BusinessEntityID
    LEFT OUTER JOIN Person.PhoneNumberType pnt 
        ON pnt.PhoneNumberTypeID = pp.PhoneNumberTypeID
    LEFT OUTER JOIN Person.BusinessEntityAddress bea 
        ON bea.BusinessEntityID = sp.BusinessEntityID
    LEFT OUTER JOIN Person.Address a 
        ON a.AddressID = bea.AddressID
    LEFT OUTER JOIN Person.StateProvince sp2 
        ON sp2.StateProvinceID = a.StateProvinceID
    LEFT OUTER JOIN Person.CountryRegion cr 
        ON cr.CountryRegionCode = sp2.CountryRegionCode
    LEFT OUTER JOIN Sales.SalesTerritory st 
        ON st.TerritoryID = sp.TerritoryID;
GO

-- Kiểm tra view đã được tạo thành công
SELECT TOP 5 * FROM Sales.vSalesPerson;
GO

PRINT 'View Sales.vSalesPerson đã được tạo thành công!';
GO
