namespace HelpDesk.Api.Dtos
{
    public class UpdateTicketDto
    {
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public int CategoryId { get; set; }
        public int PriorityId { get; set; }
    }
}
