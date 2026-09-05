"""add_phase2_learner_intelligence_models

Revision ID: 9b34cd567efa
Revises: 8a23bc456def
Create Date: 2026-09-05 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '9b34cd567efa'
down_revision: Union[str, None] = '8a23bc456def'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(length=60), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('sector', sa.String(length=100), server_default='IT-ITeS', nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('min_experience_years', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)
    op.create_index(op.f('ix_roles_code'), 'roles', ['code'], unique=True)
    op.create_index(op.f('ix_roles_title'), 'roles', ['title'], unique=False)
    op.create_index(op.f('ix_roles_sector'), 'roles', ['sector'], unique=False)

    # 2. Create role_requirements table
    op.create_table(
        'role_requirements',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.Column('competency_id', sa.UUID(), nullable=False),
        sa.Column('required_mastery', sa.Float(), server_default='0.7', nullable=False),
        sa.Column('importance', sa.String(length=30), server_default='CRITICAL', nullable=False),
        sa.Column('weight', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['competency_id'], ['competencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role_id', 'competency_id', name='uq_role_competency'),
    )
    op.create_index(op.f('ix_role_requirements_id'), 'role_requirements', ['id'], unique=False)
    op.create_index(op.f('ix_role_requirements_role_id'), 'role_requirements', ['role_id'], unique=False)
    op.create_index(op.f('ix_role_requirements_competency_id'), 'role_requirements', ['competency_id'], unique=False)
    op.create_index('ix_role_requirements_role_comp', 'role_requirements', ['role_id', 'competency_id'], unique=False)

    # 3. Add user_id and profile columns to learners table
    op.add_column('learners', sa.Column('user_id', sa.UUID(), nullable=True))
    op.add_column('learners', sa.Column('institution', sa.String(length=200), nullable=True))
    op.add_column('learners', sa.Column('graduation_year', sa.Integer(), nullable=True))
    op.add_column('learners', sa.Column('experience_years', sa.Float(), server_default='0.0', nullable=False))
    op.add_column('learners', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('learners', sa.Column('github_url', sa.String(length=255), nullable=True))
    op.add_column('learners', sa.Column('linkedin_url', sa.String(length=255), nullable=True))
    op.add_column('learners', sa.Column('portfolio_url', sa.String(length=255), nullable=True))
    op.add_column('learners', sa.Column('aspiring_role_id', sa.UUID(), nullable=True))

    op.create_foreign_key('fk_learners_user_id', 'learners', 'users', ['user_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_learners_aspiring_role_id', 'learners', 'roles', ['aspiring_role_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_learners_user_id'), 'learners', ['user_id'], unique=True)
    op.create_index(op.f('ix_learners_aspiring_role_id'), 'learners', ['aspiring_role_id'], unique=False)

    # 4. Create resumes table
    op.create_table(
        'resumes',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('learner_id', sa.String(length=50), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('storage_path', sa.String(length=500), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('parsed_text', sa.Text(), nullable=True),
        sa.Column('parsed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['learner_id'], ['learners.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_resumes_id'), 'resumes', ['id'], unique=False)
    op.create_index(op.f('ix_resumes_learner_id'), 'resumes', ['learner_id'], unique=False)

    # 5. Create resume_skills table
    op.create_table(
        'resume_skills',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('resume_id', sa.UUID(), nullable=False),
        sa.Column('raw_skill_text', sa.String(length=150), nullable=False),
        sa.Column('competency_id', sa.UUID(), nullable=True),
        sa.Column('confidence', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('years_experience', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['competency_id'], ['competencies.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_resume_skills_id'), 'resume_skills', ['id'], unique=False)
    op.create_index(op.f('ix_resume_skills_resume_id'), 'resume_skills', ['resume_id'], unique=False)
    op.create_index(op.f('ix_resume_skills_raw_skill_text'), 'resume_skills', ['raw_skill_text'], unique=False)
    op.create_index(op.f('ix_resume_skills_competency_id'), 'resume_skills', ['competency_id'], unique=False)

    # 6. Create resume_projects table
    op.create_table(
        'resume_projects',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('resume_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('technologies', sa.String(length=500), nullable=True),
        sa.Column('start_date', sa.String(length=50), nullable=True),
        sa.Column('end_date', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_resume_projects_id'), 'resume_projects', ['id'], unique=False)
    op.create_index(op.f('ix_resume_projects_resume_id'), 'resume_projects', ['resume_id'], unique=False)

    # 7. Create learner_outcomes table
    op.create_table(
        'learner_outcomes',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('learner_id', sa.String(length=50), nullable=False),
        sa.Column('role_id', sa.UUID(), nullable=True),
        sa.Column('outcome_type', sa.String(length=50), nullable=False),
        sa.Column('outcome_value', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('outcome_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('source', sa.String(length=100), server_default='DIRECT_PORTAL', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['learner_id'], ['learners.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_learner_outcomes_id'), 'learner_outcomes', ['id'], unique=False)
    op.create_index(op.f('ix_learner_outcomes_learner_id'), 'learner_outcomes', ['learner_id'], unique=False)
    op.create_index(op.f('ix_learner_outcomes_role_id'), 'learner_outcomes', ['role_id'], unique=False)
    op.create_index(op.f('ix_learner_outcomes_outcome_type'), 'learner_outcomes', ['outcome_type'], unique=False)
    op.create_index('ix_learner_outcomes_type_date', 'learner_outcomes', ['outcome_type', 'outcome_date'], unique=False)


def downgrade() -> None:
    # 7. Drop learner_outcomes
    op.drop_index('ix_learner_outcomes_type_date', table_name='learner_outcomes')
    op.drop_index(op.f('ix_learner_outcomes_outcome_type'), table_name='learner_outcomes')
    op.drop_index(op.f('ix_learner_outcomes_role_id'), table_name='learner_outcomes')
    op.drop_index(op.f('ix_learner_outcomes_learner_id'), table_name='learner_outcomes')
    op.drop_index(op.f('ix_learner_outcomes_id'), table_name='learner_outcomes')
    op.drop_table('learner_outcomes')

    # 6. Drop resume_projects
    op.drop_index(op.f('ix_resume_projects_resume_id'), table_name='resume_projects')
    op.drop_index(op.f('ix_resume_projects_id'), table_name='resume_projects')
    op.drop_table('resume_projects')

    # 5. Drop resume_skills
    op.drop_index(op.f('ix_resume_skills_competency_id'), table_name='resume_skills')
    op.drop_index(op.f('ix_resume_skills_raw_skill_text'), table_name='resume_skills')
    op.drop_index(op.f('ix_resume_skills_resume_id'), table_name='resume_skills')
    op.drop_index(op.f('ix_resume_skills_id'), table_name='resume_skills')
    op.drop_table('resume_skills')

    # 4. Drop resumes
    op.drop_index(op.f('ix_resumes_learner_id'), table_name='resumes')
    op.drop_index(op.f('ix_resumes_id'), table_name='resumes')
    op.drop_table('resumes')

    # 3. Drop learner columns and constraints
    op.drop_index(op.f('ix_learners_aspiring_role_id'), table_name='learners')
    op.drop_index(op.f('ix_learners_user_id'), table_name='learners')
    op.drop_constraint('fk_learners_aspiring_role_id', 'learners', type_='foreignkey')
    op.drop_constraint('fk_learners_user_id', 'learners', type_='foreignkey')
    op.drop_column('learners', 'aspiring_role_id')
    op.drop_column('learners', 'portfolio_url')
    op.drop_column('learners', 'linkedin_url')
    op.drop_column('learners', 'github_url')
    op.drop_column('learners', 'bio')
    op.drop_column('learners', 'experience_years')
    op.drop_column('learners', 'graduation_year')
    op.drop_column('learners', 'institution')
    op.drop_column('learners', 'user_id')

    # 2. Drop role_requirements
    op.drop_index('ix_role_requirements_role_comp', table_name='role_requirements')
    op.drop_index(op.f('ix_role_requirements_competency_id'), table_name='role_requirements')
    op.drop_index(op.f('ix_role_requirements_role_id'), table_name='role_requirements')
    op.drop_index(op.f('ix_role_requirements_id'), table_name='role_requirements')
    op.drop_table('role_requirements')

    # 1. Drop roles
    op.drop_index(op.f('ix_roles_sector'), table_name='roles')
    op.drop_index(op.f('ix_roles_title'), table_name='roles')
    op.drop_index(op.f('ix_roles_code'), table_name='roles')
    op.drop_index(op.f('ix_roles_id'), table_name='roles')
    op.drop_table('roles')
