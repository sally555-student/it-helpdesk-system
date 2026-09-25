namespace HelpDesk.Api.Dtos;

public class CategoryDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
}

public class PriorityDto
{
    public int PriorityId { get; set; }
    public string PriorityName { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class StatusDto
{
    public int StatusId { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

// One call from the frontend populates every dropdown on the create/edit ticket forms.
public class LookupResponseDto
{
    public List<CategoryDto> Categories { get; set; } = new();
    public List<PriorityDto> Priorities { get; set; } = new();
    public List<StatusDto> Statuses { get; set; } = new();
}
