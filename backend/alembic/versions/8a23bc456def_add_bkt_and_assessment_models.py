"""add_bkt_and_assessment_models

Revision ID: 8a23bc456def
Revises: 7360af0541ec
Create Date: 2026-09-05 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8a23bc456def'
down_revision: Union[str, None] = '7360af0541ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add parent_id to competencies table for hierarchical subskills
    op.add_column('competencies', sa.Column('parent_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_competencies_parent_id', 'competencies', 'competencies', ['parent_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_competencies_parent_id'), 'competencies', ['parent_id'], unique=False)

    # 2. Create assessments table
    op.create_table(
        'assessments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('code', sa.String(length=60), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sector', sa.String(length=100), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_assessments_id'), 'assessments', ['id'], unique=False)
    op.create_index(op.f('ix_assessments_code'), 'assessments', ['code'], unique=True)
    op.create_index(op.f('ix_assessments_title'), 'assessments', ['title'], unique=False)
    op.create_index(op.f('ix_assessments_sector'), 'assessments', ['sector'], unique=False)
    op.create_index(op.f('ix_assessments_is_active'), 'assessments', ['is_active'], unique=False)

    # 3. Create assessment_questions table
    op.create_table(
        'assessment_questions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('assessment_id', sa.UUID(), nullable=True),
        sa.Column('skill_id', sa.UUID(), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('options_json', sa.Text(), nullable=False),
        sa.Column('correct_answer', sa.String(length=255), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('difficulty', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['skill_id'], ['competencies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_assessment_questions_id'), 'assessment_questions', ['id'], unique=False)
    op.create_index(op.f('ix_assessment_questions_assessment_id'), 'assessment_questions', ['assessment_id'], unique=False)
    op.create_index(op.f('ix_assessment_questions_skill_id'), 'assessment_questions', ['skill_id'], unique=False)
    op.create_index(op.f('ix_assessment_questions_difficulty'), 'assessment_questions', ['difficulty'], unique=False)
    op.create_index('ix_questions_skill_difficulty', 'assessment_questions', ['skill_id', 'difficulty'], unique=False)

    # 4. Create learner_skill_mastery table
    op.create_table(
        'learner_skill_mastery',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('learner_id', sa.String(length=50), nullable=False),
        sa.Column('skill_id', sa.UUID(), nullable=False),
        sa.Column('mastery_probability', sa.Float(), nullable=False),
        sa.Column('questions_attempted', sa.Integer(), nullable=False),
        sa.Column('correct_answers', sa.Integer(), nullable=False),
        sa.Column('incorrect_answers', sa.Integer(), nullable=False),
        sa.Column('last_assessed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['learner_id'], ['learners.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['skill_id'], ['competencies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('learner_id', 'skill_id', name='uq_learner_skill_mastery'),
    )
    op.create_index(op.f('ix_learner_skill_mastery_id'), 'learner_skill_mastery', ['id'], unique=False)
    op.create_index(op.f('ix_learner_skill_mastery_learner_id'), 'learner_skill_mastery', ['learner_id'], unique=False)
    op.create_index(op.f('ix_learner_skill_mastery_skill_id'), 'learner_skill_mastery', ['skill_id'], unique=False)
    op.create_index('ix_lsm_learner_mastery', 'learner_skill_mastery', ['learner_id', 'mastery_probability'], unique=False)

    # 5. Create learner_skill_history table
    op.create_table(
        'learner_skill_history',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('learner_id', sa.String(length=50), nullable=False),
        sa.Column('skill_id', sa.UUID(), nullable=False),
        sa.Column('question_id', sa.UUID(), nullable=True),
        sa.Column('previous_mastery', sa.Float(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False),
        sa.Column('new_mastery', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['learner_id'], ['learners.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['skill_id'], ['competencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['assessment_questions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_learner_skill_history_id'), 'learner_skill_history', ['id'], unique=False)
    op.create_index(op.f('ix_learner_skill_history_learner_id'), 'learner_skill_history', ['learner_id'], unique=False)
    op.create_index(op.f('ix_learner_skill_history_skill_id'), 'learner_skill_history', ['skill_id'], unique=False)
    op.create_index(op.f('ix_learner_skill_history_question_id'), 'learner_skill_history', ['question_id'], unique=False)
    op.create_index(op.f('ix_learner_skill_history_created_at'), 'learner_skill_history', ['created_at'], unique=False)
    op.create_index('ix_lsh_learner_skill_created', 'learner_skill_history', ['learner_id', 'skill_id', 'created_at'], unique=False)

    # 6. Create assessment_submissions table
    op.create_table(
        'assessment_submissions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('learner_id', sa.String(length=50), nullable=False),
        sa.Column('assessment_id', sa.UUID(), nullable=False),
        sa.Column('score_percentage', sa.Float(), nullable=False),
        sa.Column('total_questions', sa.Integer(), nullable=False),
        sa.Column('correct_count', sa.Integer(), nullable=False),
        sa.Column('responses_json', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['learner_id'], ['learners.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_assessment_submissions_id'), 'assessment_submissions', ['id'], unique=False)
    op.create_index(op.f('ix_assessment_submissions_learner_id'), 'assessment_submissions', ['learner_id'], unique=False)
    op.create_index(op.f('ix_assessment_submissions_assessment_id'), 'assessment_submissions', ['assessment_id'], unique=False)


def downgrade() -> None:
    op.drop_table('assessment_submissions')
    op.drop_table('learner_skill_history')
    op.drop_table('learner_skill_mastery')
    op.drop_table('assessment_questions')
    op.drop_table('assessments')
    op.drop_index(op.f('ix_competencies_parent_id'), table_name='competencies')
    op.drop_constraint('fk_competencies_parent_id', 'competencies', type_='foreignkey')
    op.drop_column('competencies', 'parent_id')
