from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from ytmusicianship.config import settings

scheduler = BackgroundScheduler(
    jobstores={
        "default": SQLAlchemyJobStore(url=f"sqlite:///{settings.ytm_db_path}"),
    },
    job_defaults={
        "coalesce": False,
        "max_instances": 1,
    },
)
