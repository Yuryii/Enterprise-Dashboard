using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EnterpriseDashboard.Core.Events.RegisterSuccessed
{
    public class RegisterSuccessedEvent : INotification
    {
        public string Email { get; set; }

        public RegisterSuccessedEvent(string email)
        {
            Email = email;
        }
    }
}
