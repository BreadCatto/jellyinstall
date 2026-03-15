import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from backend.app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)


class DownloadRecord(Base):
    __tablename__ = "download_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    filename = Column(String(500), nullable=False)
    url = Column(Text, nullable=False)
    quality = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=True)
    media_type = Column(String(20), nullable=False)  # "movie" or "show"
    status = Column(String(20), nullable=False, default="pending")  # pending, downloading, completed, failed, cancelled
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    download_path = Column(Text, nullable=True)
