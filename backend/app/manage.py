"""
CLI tool to manage users.
Usage:
    python -m backend.app.manage create-user --username <name> --password <pass>
"""

import argparse
import asyncio
import sys
from sqlalchemy import select
from backend.app.database import async_session, init_db
from backend.app.models import User
from backend.app.auth import hash_password


async def create_user(username: str, password: str):
    await init_db()
    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == username))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"Error: User '{username}' already exists.")
            sys.exit(1)

        user = User(username=username, password_hash=hash_password(password))
        db.add(user)
        await db.commit()
        print(f"User '{username}' created successfully.")


async def list_users():
    await init_db()
    async with async_session() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        if not users:
            print("No users found.")
            return
        print(f"{'ID':<6} {'Username':<30} {'Created At'}")
        print("-" * 70)
        for u in users:
            print(f"{u.id:<6} {u.username:<30} {u.created_at}")


def main():
    parser = argparse.ArgumentParser(description="JellyInstall User Management")
    sub = parser.add_subparsers(dest="command")

    create_cmd = sub.add_parser("create-user", help="Create a new user")
    create_cmd.add_argument("--username", required=True)
    create_cmd.add_argument("--password", required=True)

    sub.add_parser("list-users", help="List all users")

    args = parser.parse_args()

    if args.command == "create-user":
        asyncio.run(create_user(args.username, args.password))
    elif args.command == "list-users":
        asyncio.run(list_users())
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
