// Handles logical operations related to department

package department

type Service struct {
	repo *Repository
}

// NewService creates a new department service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// GetDeptByID retrieves department details by its ID
func (service *Service) GetDeptByID(deptID int64) (*Department, error) {
	return service.repo.GetDeptByID(deptID)
}
