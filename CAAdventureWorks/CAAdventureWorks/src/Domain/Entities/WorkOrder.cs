using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Domain.Entities;

[Table("WorkOrder", Schema = "Production")]
[Index("ProductId", Name = "IX_WorkOrder_ProductID")]
[Index("ScrapReasonId", Name = "IX_WorkOrder_ScrapReasonID")]
public partial class WorkOrder
{
    [Key]
    [Column("WorkOrderID")]
    public int WorkOrderId { get; set; }

    [Column("ProductID")]
    public int ProductId { get; set; }

    public int OrderQty { get; set; }

    public int StockedQty { get; set; }

    public short ScrappedQty { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime StartDate { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? EndDate { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime DueDate { get; set; }

    [Column("ScrapReasonID")]
    public short? ScrapReasonId { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime ModifiedDate { get; set; }

    [ForeignKey("ProductId")]
    [InverseProperty("WorkOrders")]
    public virtual Product Product { get; set; } = null!;

    [ForeignKey("ScrapReasonId")]
    [InverseProperty("WorkOrders")]
    public virtual ScrapReason? ScrapReason { get; set; }

    [InverseProperty("WorkOrder")]
    public virtual ICollection<WorkOrderRouting> WorkOrderRoutings { get; set; } = new List<WorkOrderRouting>();
}
