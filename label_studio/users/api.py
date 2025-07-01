"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from core.permissions import ViewClassPermission, all_permissions
from django.utils.decorators import method_decorator
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import generics, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from users.functions import check_avatar
from users.models import User
from users.serializers import UserSerializer, UserSerializerUpdate

logger = logging.getLogger(__name__)

_user_schema = {
    'type': 'object',
    'properties': {
        'id': OpenApiTypes.INT,
        'first_name': OpenApiTypes.STR,
        'last_name': OpenApiTypes.STR,
        'username': OpenApiTypes.STR,
        'email': OpenApiTypes.STR,
        'avatar': OpenApiTypes.STR,
        'initials': OpenApiTypes.STR,
        'phone': OpenApiTypes.STR,
        'allow_newsletters': OpenApiTypes.BOOL,
    },
}


@method_decorator(
    name='update',
    decorator=extend_schema(
        tags=['Users'],
        summary='Save user details',
        description="""
    Save details for a specific user, such as their name or contact information, in Label Studio.
    """,
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='User ID'),
        ],
        request=UserSerializer,
    ),
)
@method_decorator(
    name='list',
    decorator=extend_schema(
        tags=['Users'],
        summary='List users',
        description='List the users that exist on the Label Studio server.',
    ),
)
@method_decorator(
    name='create',
    decorator=extend_schema(
        tags=['Users'],
        summary='Create new user',
        description='Create a user in Label Studio.',
        request=_user_schema,
        responses={201: UserSerializer},
    ),
)
@method_decorator(
    name='retrieve',
    decorator=extend_schema(
        tags=['Users'],
        summary='Get user info',
        description='Get info about a specific Label Studio user, based on the user ID.',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='User ID'),
        ],
        request=None,
        responses={200: UserSerializer},
    ),
)
@method_decorator(
    name='partial_update',
    decorator=extend_schema(
        tags=['Users'],
        summary='Update user details',
        description="""
        Update details for a specific user, such as their name or contact information, in Label Studio.
        """,
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='User ID'),
        ],
        request=_user_schema,
        responses={200: UserSerializer},
    ),
)
@method_decorator(
    name='destroy',
    decorator=extend_schema(
        tags=['Users'],
        summary='Delete user',
        description='Delete a specific Label Studio user.',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='User ID'),
        ],
        request=None,
    ),
)
class UserAPI(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_change,
        PUT=all_permissions.organizations_change,
        POST=all_permissions.organizations_change,
        PATCH=all_permissions.organizations_view,
        DELETE=all_permissions.organizations_change,
    )
    http_method_names = ['get', 'post', 'head', 'patch', 'delete']

    def get_queryset(self):
        return User.objects.filter(organizations=self.request.user.active_organization)

    @extend_schema(methods=['delete', 'post'], exclude=True)
    @action(detail=True, methods=['delete', 'post'], permission_required=all_permissions.avatar_any)
    def avatar(self, request, pk):
        if request.method == 'POST':
            avatar = check_avatar(request.FILES)
            request.user.avatar = avatar
            request.user.save()
            return Response({'detail': 'avatar saved'}, status=200)

        elif request.method == 'DELETE':
            request.user.avatar = None
            request.user.save()
            return Response(status=204)

    def get_serializer_class(self):
        if self.request.method in {'PUT', 'PATCH'}:
            return UserSerializerUpdate
        return super().get_serializer_class()

    def get_serializer_context(self):
        context = super(UserAPI, self).get_serializer_context()
        context['user'] = self.request.user
        return context

    def update(self, request, *args, **kwargs):
        return super(UserAPI, self).update(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        return super(UserAPI, self).list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        return super(UserAPI, self).create(request, *args, **kwargs)

    def perform_create(self, serializer):
        instance = serializer.save()
        self.request.user.active_organization.add_user(instance)

    def retrieve(self, request, *args, **kwargs):
        return super(UserAPI, self).retrieve(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        result = super(UserAPI, self).partial_update(request, *args, **kwargs)

        # throw MethodNotAllowed if read-only fields are attempted to be updated
        read_only_fields = self.get_serializer_class().Meta.read_only_fields
        for field in read_only_fields:
            if field in request.data:
                raise MethodNotAllowed('PATCH', detail=f'Cannot update read-only field: {field}')

        # newsletters
        if 'allow_newsletters' in request.data:
            user = User.objects.get(id=request.user.id)  # we need an updated user
            request.user.advanced_json = {  # request.user instance will be unchanged in request all the time
                'email': user.email,
                'allow_newsletters': user.allow_newsletters,
                'update-notifications': 1,
                'new-user': 0,
            }
        return result

    def destroy(self, request, *args, **kwargs):
        return super(UserAPI, self).destroy(request, *args, **kwargs)


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Users'],
        summary='Reset user token',
        description='Reset the user token for the current user.',
        request=None,
        responses={
            201: OpenApiResponse(
                description='User token response',
                response={
                    'type': 'object',
                    'properties': {'token': OpenApiTypes.STR},
                },
            )
        },
    ),
)
class UserResetTokenAPI(APIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = User.objects.all()
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        user = request.user
        token = user.reset_token()
        logger.debug(f'New token for user {user.pk} is {token.key}')
        return Response({'token': token.key}, status=201)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Users'],
        summary='Get user token',
        description='Get a user token to authenticate to the API as the current user.',
        request=None,
        responses={
            200: OpenApiResponse(
                description='User token response',
                response={
                    'type': 'object',
                    'properties': {'detail': OpenApiTypes.STR},
                },
            )
        },
    ),
)
class UserGetTokenAPI(APIView):
    parser_classes = (JSONParser,)
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        user = request.user
        token = Token.objects.get(user=user)
        return Response({'token': str(token)}, status=200)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Users'],
        summary='Retrieve my user',
        description='Retrieve details of the account that you are using to access the API.',
        request=None,
        responses={200: UserSerializer},
    ),
)
class UserWhoAmIAPI(generics.RetrieveAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = User.objects.all()
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get(self, request, *args, **kwargs):
        return super(UserWhoAmIAPI, self).get(request, *args, **kwargs)
